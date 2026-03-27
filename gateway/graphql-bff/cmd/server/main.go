package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/trustinbox/cornerstone/auth/jwt"
	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

func main() {
	cfg := config.LoadServiceConfig("graphql-bff")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	log.Info("starting GraphQL gateway",
		zap.String("http_port", cfg.HTTPPort),
	)

	// Connect to PostgreSQL
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal("failed to connect to database", zap.Error(err))
	}
	defer db.Close()
	db.SetMaxOpenConns(10)

	if err := db.Ping(); err != nil {
		log.Fatal("failed to ping database", zap.Error(err))
	}
	log.Info("connected to database")

	// JWT token service
	tokenSvc := jwt.NewTokenService(
		cfg.JWTSecret,
		15*time.Minute,
		7*24*time.Hour,
	)

	mux := http.NewServeMux()

	// CORS middleware
	handler := corsMiddleware(mux)

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth endpoints
	mux.HandleFunc("/api/auth/login", handleLogin(db, tokenSvc, log))
	mux.HandleFunc("/api/auth/register", handleRegister(db, tokenSvc, log))
	mux.HandleFunc("/api/auth/me", handleMe(db, tokenSvc, log))

	// User endpoints
	mux.HandleFunc("/api/users/search", handleSearchUsers(db, tokenSvc, log))

	// Friend request endpoints
	sseHub := newSSEHub()
	mux.HandleFunc("/api/friends/request", handleFriendRequest(db, tokenSvc, log, sseHub))
	mux.HandleFunc("/api/friends/requests", handleListFriendRequests(db, tokenSvc, log))
	mux.HandleFunc("/api/friends/respond", handleRespondFriendRequest(db, tokenSvc, log, sseHub))
	mux.HandleFunc("/api/friends", handleListFriends(db, tokenSvc, log))
	mux.HandleFunc("/api/friends/remove", handleRemoveFriend(db, tokenSvc, log))

	// Notification endpoints
	mux.HandleFunc("/api/notifications", handleListNotifications(db, tokenSvc, log))
	mux.HandleFunc("/api/notifications/read", handleMarkNotificationsRead(db, tokenSvc, log))
	mux.HandleFunc("/api/notifications/stream", handleSSEStream(tokenSvc, log, sseHub))

	// GraphQL placeholder (will be replaced with gqlgen)
	mux.HandleFunc("/graphql", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message":"GraphQL endpoint. Auth endpoints available at /api/auth/*"}`))
	})

	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", cfg.HTTPPort),
		Handler: handler,
	}

	go func() {
		log.Info("HTTP server listening", zap.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("HTTP server failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down GraphQL gateway")
	server.Close()
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	User         userResponse `json:"user"`
}

type userResponse struct {
	ID              string `json:"id"`
	Email           string `json:"email"`
	FullName        string `json:"fullName"`
	Username        string `json:"username"`
	VirtualPublicID string `json:"virtualPublicId,omitempty"`
}

type errorResponse struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func handleLogin(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		if req.Email == "" || req.Password == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "email and password are required"})
			return
		}

		// Look up user
		var userID, email, passwordHash, status string
		err := db.QueryRowContext(r.Context(),
			`SELECT id, email, password_hash, status FROM users WHERE email = $1`, req.Email,
		).Scan(&userID, &email, &passwordHash, &status)
		if err != nil {
			log.Warn("login failed: user not found", zap.String("email", req.Email))
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid credentials"})
			return
		}

		// Verify password
		if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
			log.Warn("login failed: wrong password", zap.String("email", req.Email))
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid credentials"})
			return
		}

		if status != "ACTIVE" {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "account is not active"})
			return
		}

		// Generate tokens
		accessToken, err := tokenSvc.GenerateAccessToken(userID, "USER", "")
		if err != nil {
			log.Error("failed to generate access token", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		refreshToken, err := tokenSvc.GenerateRefreshToken(userID)
		if err != nil {
			log.Error("failed to generate refresh token", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		// Store refresh token hash
		hash := sha256.Sum256([]byte(refreshToken))
		tokenHash := hex.EncodeToString(hash[:])
		_, err = db.ExecContext(r.Context(),
			`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
			 VALUES ($1, $2, $3, $4, false, NOW())`,
			uuid.New().String(), userID, tokenHash, time.Now().Add(7*24*time.Hour),
		)
		if err != nil {
			log.Error("failed to store refresh token", zap.Error(err))
		}

		// Get user profile + username + virtual identity
		var fullName, username string
		_ = db.QueryRowContext(r.Context(),
			`SELECT p.full_name, u2.username FROM user_profiles p
			 JOIN users u2 ON u2.id = p.user_id
			 WHERE p.user_id = $1`, userID,
		).Scan(&fullName, &username)

		var virtualPublicID string
		_ = db.QueryRowContext(r.Context(),
			`SELECT virtual_public_id FROM user_identities WHERE user_id = $1 AND is_active = TRUE LIMIT 1`, userID,
		).Scan(&virtualPublicID)

		log.Info("user logged in", zap.String("user_id", userID), zap.String("username", username))

		writeJSON(w, http.StatusOK, authResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			User: userResponse{
				ID:              userID,
				Email:           email,
				FullName:        fullName,
				Username:        username,
				VirtualPublicID: virtualPublicID,
			},
		})
	}
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
	Mobile   string `json:"mobile"`
	Username string `json:"username"`
}

var usernameRegex = regexp.MustCompile(`^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$`)

func generateVirtualPublicID() string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 8)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return "TI-" + string(b)
}

func handleRegister(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		var req registerRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		if req.Email == "" || req.Password == "" || req.FullName == "" || req.Username == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "email, password, fullName, and username are required"})
			return
		}

		// Validate username format (lowercase alphanumeric, dots, hyphens, underscores)
		rawUsername := strings.ToLower(strings.TrimSpace(req.Username))
		if !usernameRegex.MatchString(rawUsername) {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "username must be 3-30 chars, lowercase letters, numbers, dots, hyphens, or underscores"})
			return
		}

		// Add c/ prefix for customer accounts
		username := "c/" + rawUsername

		// Check if user already exists (email or username)
		var exists bool
		db.QueryRowContext(r.Context(), `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, req.Email).Scan(&exists)
		if exists {
			writeJSON(w, http.StatusConflict, errorResponse{Error: "user with this email already exists"})
			return
		}
		db.QueryRowContext(r.Context(), `SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)`, username).Scan(&exists)
		if exists {
			writeJSON(w, http.StatusConflict, errorResponse{Error: "username is already taken"})
			return
		}

		// Hash password
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		userID := uuid.New().String()

		// Create user + profile in a transaction
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer tx.Rollback()

		_, err = tx.ExecContext(r.Context(),
			`INSERT INTO users (id, email, mobile, password_hash, username, status, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())`,
			userID, req.Email, req.Mobile, string(hash), username,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create user"})
			return
		}

		_, err = tx.ExecContext(r.Context(),
			`INSERT INTO user_profiles (user_id, full_name, timezone, language)
			 VALUES ($1, $2, 'UTC', 'en')`,
			userID, req.FullName,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create profile"})
			return
		}

		// Create virtual public identity (privacy layer for org interactions)
		virtualPublicID := generateVirtualPublicID()
		maskedPhone := maskPhone(req.Mobile)
		_, err = tx.ExecContext(r.Context(),
			`INSERT INTO user_identities (id, user_id, virtual_public_id, masked_phone, is_active, created_at)
			 VALUES ($1, $2, $3, $4, TRUE, NOW())`,
			uuid.New().String(), userID, virtualPublicID, maskedPhone,
		)
		if err != nil {
			log.Error("failed to create virtual identity", zap.Error(err))
		}

		if err := tx.Commit(); err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		// Generate tokens
		accessToken, _ := tokenSvc.GenerateAccessToken(userID, "USER", "")
		refreshToken, _ := tokenSvc.GenerateRefreshToken(userID)

		// Store refresh token hash
		h := sha256.Sum256([]byte(refreshToken))
		tokenHash := hex.EncodeToString(h[:])
		db.ExecContext(r.Context(),
			`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
			 VALUES ($1, $2, $3, $4, false, NOW())`,
			uuid.New().String(), userID, tokenHash, time.Now().Add(7*24*time.Hour),
		)

		log.Info("user registered", zap.String("user_id", userID), zap.String("username", username))

		writeJSON(w, http.StatusCreated, authResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			User: userResponse{
				ID:              userID,
				Email:           req.Email,
				FullName:        req.FullName,
				Username:        username,
				VirtualPublicID: virtualPublicID,
			},
		})
	}
}

func handleMe(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		// Extract bearer token
		auth := r.Header.Get("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "missing or invalid authorization header"})
			return
		}
		tokenStr := strings.TrimPrefix(auth, "Bearer ")

		claims, err := tokenSvc.ValidateAccessToken(tokenStr)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid or expired token"})
			return
		}

		var email, fullName, username string
		err = db.QueryRowContext(r.Context(),
			`SELECT u.email, COALESCE(p.full_name, ''), u.username
			 FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id
			 WHERE u.id = $1`, claims.UserID,
		).Scan(&email, &fullName, &username)
		if err != nil {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "user not found"})
			return
		}

		var virtualPublicID string
		_ = db.QueryRowContext(r.Context(),
			`SELECT virtual_public_id FROM user_identities WHERE user_id = $1 AND is_active = TRUE LIMIT 1`, claims.UserID,
		).Scan(&virtualPublicID)

		writeJSON(w, http.StatusOK, userResponse{
			ID:              claims.UserID,
			Email:           email,
			FullName:        fullName,
			Username:        username,
			VirtualPublicID: virtualPublicID,
		})
	}
}

func maskPhone(phone string) string {
	if len(phone) < 6 {
		return phone
	}
	return phone[:3] + strings.Repeat("*", len(phone)-5) + phone[len(phone)-2:]
}

type searchUserResult struct {
	ID              string `json:"id"`
	Username        string `json:"username"`
	FullName        string `json:"fullName"`
	VirtualPublicID string `json:"virtualPublicId,omitempty"`
	Online          bool   `json:"online"`
}

func handleSearchUsers(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		// Auth check
		auth := r.Header.Get("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "missing or invalid authorization header"})
			return
		}
		tokenStr := strings.TrimPrefix(auth, "Bearer ")

		claims, err := tokenSvc.ValidateAccessToken(tokenStr)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid or expired token"})
			return
		}

		q := strings.TrimSpace(r.URL.Query().Get("q"))
		if len(q) < 2 {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "query must be at least 2 characters"})
			return
		}

		// Limit query length to prevent abuse
		if len(q) > 100 {
			q = q[:100]
		}

		searchPattern := "%" + strings.ToLower(q) + "%"

		rows, err := db.QueryContext(r.Context(),
			`SELECT u.id, u.username, COALESCE(p.full_name, ''), COALESCE(ui.virtual_public_id, '')
			 FROM users u
			 LEFT JOIN user_profiles p ON u.id = p.user_id
			 LEFT JOIN user_identities ui ON u.id = ui.user_id AND ui.is_active = TRUE
			 WHERE u.id != $1
			   AND u.status = 'ACTIVE'
			   AND (LOWER(u.username) LIKE $2 OR LOWER(p.full_name) LIKE $2)
			 ORDER BY p.full_name ASC
			 LIMIT 20`,
			claims.UserID, searchPattern,
		)
		if err != nil {
			log.Error("failed to search users", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer rows.Close()

		results := []searchUserResult{}
		for rows.Next() {
			var u searchUserResult
			if err := rows.Scan(&u.ID, &u.Username, &u.FullName, &u.VirtualPublicID); err != nil {
				continue
			}
			results = append(results, u)
		}

		writeJSON(w, http.StatusOK, results)
	}
}

// ==================== Auth Helper ====================

func extractUserID(r *http.Request, tokenSvc *jwt.TokenService) (string, error) {
	auth := r.Header.Get("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
		return "", fmt.Errorf("missing auth")
	}
	claims, err := tokenSvc.ValidateAccessToken(strings.TrimPrefix(auth, "Bearer "))
	if err != nil {
		return "", err
	}
	return claims.UserID, nil
}

// ==================== SSE Hub ====================

type sseClient struct {
	userID string
	ch     chan []byte
}

type sseHub struct {
	mu      sync.RWMutex
	clients map[string][]*sseClient
}

func newSSEHub() *sseHub {
	return &sseHub{clients: make(map[string][]*sseClient)}
}

func (h *sseHub) register(c *sseClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[c.userID] = append(h.clients[c.userID], c)
}

func (h *sseHub) unregister(c *sseClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	clients := h.clients[c.userID]
	for i, cl := range clients {
		if cl == c {
			h.clients[c.userID] = append(clients[:i], clients[i+1:]...)
			break
		}
	}
}

func (h *sseHub) send(userID string, eventType string, data interface{}) {
	payload, err := json.Marshal(data)
	if err != nil {
		return
	}
	msg := fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, string(payload))
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, c := range h.clients[userID] {
		select {
		case c.ch <- []byte(msg):
		default:
			// Drop if client buffer full
		}
	}
}

// ==================== SSE Stream ====================

func handleSSEStream(tokenSvc *jwt.TokenService, log *zap.Logger, hub *sseHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// SSE supports token via query param since EventSource doesn't support headers
		tokenStr := r.URL.Query().Get("token")
		if tokenStr == "" {
			// Fallback to Authorization header
			auth := r.Header.Get("Authorization")
			if strings.HasPrefix(auth, "Bearer ") {
				tokenStr = strings.TrimPrefix(auth, "Bearer ")
			}
		}
		if tokenStr == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		claims, err := tokenSvc.ValidateAccessToken(tokenStr)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		userID := claims.UserID

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming not supported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		client := &sseClient{userID: userID, ch: make(chan []byte, 16)}
		hub.register(client)
		defer hub.unregister(client)

		log.Info("SSE client connected", zap.String("user_id", userID))

		// Send initial keepalive
		fmt.Fprintf(w, ": connected\n\n")
		flusher.Flush()

		ctx := r.Context()
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Info("SSE client disconnected", zap.String("user_id", userID))
				return
			case msg := <-client.ch:
				w.Write(msg)
				flusher.Flush()
			case <-ticker.C:
				fmt.Fprintf(w, ": keepalive\n\n")
				flusher.Flush()
			}
		}
	}
}

// ==================== Notification Helpers ====================

type notificationResponse struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Body      string          `json:"body,omitempty"`
	Data      json.RawMessage `json:"data,omitempty"`
	Read      bool            `json:"read"`
	CreatedAt string          `json:"createdAt"`
}

func createNotification(db *sql.DB, hub *sseHub, userID, nType, title, body string, data interface{}) {
	dataJSON, _ := json.Marshal(data)
	var id string
	err := db.QueryRow(
		`INSERT INTO notifications (user_id, type, title, body, data, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
		userID, nType, title, body, dataJSON,
	).Scan(&id)
	if err != nil {
		return
	}

	hub.send(userID, "notification", map[string]interface{}{
		"id":        id,
		"type":      nType,
		"title":     title,
		"body":      body,
		"data":      data,
		"read":      false,
		"createdAt": time.Now().Format(time.RFC3339),
	})
}

// ==================== Friend Request Handlers ====================

type friendRequestInput struct {
	ReceiverID string `json:"receiverId"`
	Message    string `json:"message,omitempty"`
}

func handleFriendRequest(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger, hub *sseHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var input friendRequestInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		if input.ReceiverID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "receiverId is required"})
			return
		}

		if input.ReceiverID == userID {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "cannot send request to yourself"})
			return
		}

		// Check if already friends
		var exists bool
		db.QueryRow(`SELECT EXISTS(SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2)`,
			userID, input.ReceiverID).Scan(&exists)
		if exists {
			writeJSON(w, http.StatusConflict, errorResponse{Error: "already friends"})
			return
		}

		// Check if request already exists (either direction)
		db.QueryRow(`SELECT EXISTS(SELECT 1 FROM friend_requests 
			WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
			AND status = 'PENDING')`,
			userID, input.ReceiverID).Scan(&exists)
		if exists {
			writeJSON(w, http.StatusConflict, errorResponse{Error: "request already pending"})
			return
		}

		var reqID string
		err = db.QueryRow(
			`INSERT INTO friend_requests (sender_id, receiver_id, message, status) 
			 VALUES ($1, $2, $3, 'PENDING') RETURNING id`,
			userID, input.ReceiverID, input.Message,
		).Scan(&reqID)
		if err != nil {
			log.Error("failed to create friend request", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to send request"})
			return
		}

		// Get sender name for notification
		var senderName string
		db.QueryRow(`SELECT COALESCE(p.full_name, u.username) FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id = $1`, userID).Scan(&senderName)

		// Create notification for receiver
		createNotification(db, hub, input.ReceiverID, "FRIEND_REQUEST",
			"New Connection Request",
			fmt.Sprintf("%s wants to connect with you", senderName),
			map[string]string{"requestId": reqID, "senderId": userID, "senderName": senderName},
		)

		log.Info("friend request sent", zap.String("from", userID), zap.String("to", input.ReceiverID))
		writeJSON(w, http.StatusCreated, map[string]string{"id": reqID, "status": "PENDING"})
	}
}

type friendRequestResponse struct {
	ID        string           `json:"id"`
	User      searchUserResult `json:"user"`
	Direction string           `json:"direction"`
	Status    string           `json:"status"`
	Message   string           `json:"message,omitempty"`
	CreatedAt string           `json:"createdAt"`
}

func handleListFriendRequests(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		rows, err := db.QueryContext(r.Context(),
			`SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, COALESCE(fr.message, ''), fr.created_at,
			        u.id, u.username, COALESCE(p.full_name, ''), COALESCE(ui.virtual_public_id, '')
			 FROM friend_requests fr
			 JOIN users u ON u.id = CASE WHEN fr.sender_id = $1 THEN fr.receiver_id ELSE fr.sender_id END
			 LEFT JOIN user_profiles p ON p.user_id = u.id
			 LEFT JOIN user_identities ui ON ui.user_id = u.id AND ui.is_active = TRUE
			 WHERE (fr.sender_id = $1 OR fr.receiver_id = $1)
			   AND fr.status = 'PENDING'
			 ORDER BY fr.created_at DESC`, userID)
		if err != nil {
			log.Error("failed to list friend requests", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer rows.Close()

		results := []friendRequestResponse{}
		for rows.Next() {
			var fr friendRequestResponse
			var senderID, receiverID, createdAt string
			if err := rows.Scan(&fr.ID, &senderID, &receiverID, &fr.Status, &fr.Message, &createdAt,
				&fr.User.ID, &fr.User.Username, &fr.User.FullName, &fr.User.VirtualPublicID); err != nil {
				continue
			}
			if senderID == userID {
				fr.Direction = "outgoing"
			} else {
				fr.Direction = "incoming"
			}
			t, _ := time.Parse(time.RFC3339Nano, createdAt)
			fr.CreatedAt = t.Format(time.RFC3339)
			results = append(results, fr)
		}

		writeJSON(w, http.StatusOK, results)
	}
}

type respondInput struct {
	RequestID string `json:"requestId"`
	Action    string `json:"action"` // "accept" or "reject"
}

func handleRespondFriendRequest(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger, hub *sseHub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var input respondInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		if input.RequestID == "" || (input.Action != "accept" && input.Action != "reject") {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "requestId and action (accept/reject) are required"})
			return
		}

		// Get the request - user must be receiver
		var senderID, receiverID, status string
		err = db.QueryRow(
			`SELECT sender_id, receiver_id, status FROM friend_requests WHERE id = $1`, input.RequestID,
		).Scan(&senderID, &receiverID, &status)
		if err != nil {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "request not found"})
			return
		}

		if receiverID != userID {
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "you can only respond to requests sent to you"})
			return
		}

		if status != "PENDING" {
			writeJSON(w, http.StatusConflict, errorResponse{Error: "request is no longer pending"})
			return
		}

		newStatus := "REJECTED"
		if input.Action == "accept" {
			newStatus = "ACCEPTED"
		}

		tx, err := db.Begin()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer tx.Rollback()

		_, err = tx.Exec(`UPDATE friend_requests SET status = $1, updated_at = NOW() WHERE id = $2`, newStatus, input.RequestID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to update request"})
			return
		}

		if input.Action == "accept" {
			// Create bidirectional friendship
			_, err = tx.Exec(
				`INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2), ($2, $1)
				 ON CONFLICT DO NOTHING`,
				senderID, receiverID)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create friendship"})
				return
			}
		}

		if err := tx.Commit(); err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		// Send notification to sender
		var responderName string
		db.QueryRow(`SELECT COALESCE(p.full_name, u.username) FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id = $1`, userID).Scan(&responderName)

		if input.Action == "accept" {
			createNotification(db, hub, senderID, "FRIEND_ACCEPTED",
				"Connection Accepted",
				fmt.Sprintf("%s accepted your connection request", responderName),
				map[string]string{"friendId": userID, "friendName": responderName},
			)
		}

		log.Info("friend request responded", zap.String("request_id", input.RequestID), zap.String("action", input.Action))
		writeJSON(w, http.StatusOK, map[string]string{"status": newStatus})
	}
}

type friendResponse struct {
	ID        string           `json:"id"`
	User      searchUserResult `json:"user"`
	CreatedAt string           `json:"createdAt"`
}

func handleListFriends(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		rows, err := db.QueryContext(r.Context(),
			`SELECT f.id, u.id, u.username, COALESCE(p.full_name, ''), COALESCE(ui.virtual_public_id, ''), f.created_at
			 FROM friendships f
			 JOIN users u ON u.id = f.friend_id
			 LEFT JOIN user_profiles p ON p.user_id = u.id
			 LEFT JOIN user_identities ui ON ui.user_id = u.id AND ui.is_active = TRUE
			 WHERE f.user_id = $1
			 ORDER BY p.full_name ASC`, userID)
		if err != nil {
			log.Error("failed to list friends", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer rows.Close()

		results := []friendResponse{}
		for rows.Next() {
			var f friendResponse
			var createdAt string
			if err := rows.Scan(&f.ID, &f.User.ID, &f.User.Username, &f.User.FullName, &f.User.VirtualPublicID, &createdAt); err != nil {
				continue
			}
			t, _ := time.Parse(time.RFC3339Nano, createdAt)
			f.CreatedAt = t.Format(time.RFC3339)
			results = append(results, f)
		}

		writeJSON(w, http.StatusOK, results)
	}
}

type removeInput struct {
	FriendID string `json:"friendId"`
}

func handleRemoveFriend(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var input removeInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		// Remove both directions
		_, err = db.Exec(`DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
			userID, input.FriendID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to remove friend"})
			return
		}

		// Also clean up any friend requests
		db.Exec(`UPDATE friend_requests SET status = 'CANCELLED', updated_at = NOW()
			WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
			AND status IN ('PENDING', 'ACCEPTED')`, userID, input.FriendID)

		log.Info("friend removed", zap.String("user_id", userID), zap.String("friend_id", input.FriendID))
		writeJSON(w, http.StatusOK, map[string]string{"status": "removed"})
	}
}

// ==================== Notification Handlers ====================

func handleListNotifications(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		rows, err := db.QueryContext(r.Context(),
			`SELECT id, type, title, COALESCE(body, ''), COALESCE(data::text, '{}'), read, created_at
			 FROM notifications
			 WHERE user_id = $1
			 ORDER BY created_at DESC
			 LIMIT 50`, userID)
		if err != nil {
			log.Error("failed to list notifications", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer rows.Close()

		results := []notificationResponse{}
		for rows.Next() {
			var n notificationResponse
			var dataStr, createdAt string
			if err := rows.Scan(&n.ID, &n.Type, &n.Title, &n.Body, &dataStr, &n.Read, &createdAt); err != nil {
				continue
			}
			n.Data = json.RawMessage(dataStr)
			t, _ := time.Parse(time.RFC3339Nano, createdAt)
			n.CreatedAt = t.Format(time.RFC3339)
			results = append(results, n)
		}

		writeJSON(w, http.StatusOK, results)
	}
}

type markReadInput struct {
	IDs []string `json:"ids"`
	All bool     `json:"all"`
}

func handleMarkNotificationsRead(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		var input markReadInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}

		if input.All {
			_, err = db.Exec(`UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`, userID)
		} else if len(input.IDs) > 0 {
			// Mark specific ones
			for _, id := range input.IDs {
				db.Exec(`UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`, id, userID)
			}
		}

		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to mark read"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
