package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	mathrand "math/rand"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"sync"
	"syscall"
	"time"

	gojwt "github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"github.com/trustinbox/cornerstone/auth/jwt"
	"github.com/trustinbox/cornerstone/config"
	logger "github.com/trustinbox/cornerstone/logging"
	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/graphql-bff/graph/generated"
	"github.com/trustinbox/graphql-bff/graph/resolver"
	"github.com/trustinbox/graphql-bff/internal/clients"
	authpb "github.com/trustinbox/proto/gen/auth/v1"
	notifpb "github.com/trustinbox/proto/gen/notification/v1"
	userpb "github.com/trustinbox/proto/gen/user/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	gqlhandler "github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/lib/pq"
)

func main() {
	cfg := config.LoadServiceConfig("graphql-bff")
	log := logger.New(cfg.ServiceName)
	defer log.Sync()

	// ─── OpenTelemetry tracing ─────────────────────────────
	if tracerCleanup, err := tracing.InitTracer(cfg.ServiceName); err != nil {
		log.Warn("tracing init failed; continuing without OTel traces", zap.Error(err))
	} else {
		defer tracerCleanup()
	}

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

	// Connect to Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     getEnvOrDefault("REDIS_ADDR", "localhost:6379"),
		Password: getEnvOrDefault("REDIS_PASSWORD", ""),
		DB:       0,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatal("failed to connect to Redis", zap.Error(err))
	}
	log.Info("connected to Redis")

	// Connect to backend gRPC services
	svc, err := clients.NewServiceClients(log)
	if err != nil {
		log.Fatal("failed to create service clients", zap.Error(err))
	}
	defer svc.Close()

	// Initialize MinIO client
	minioClient := initMinioClient(log)

	// SSE hub — created first so wsHub can reference it for presence delivery
	sseHub := newSSEHub()

	// WebSocket hub with Redis Pub/Sub (chat:broadcast + presence:events)
	wsHub := newWSHub(rdb, db, sseHub, log)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go wsHub.run(ctx)

	// Provider SSE event subscriber — listens to Redis Pub/Sub and pushes to connected SSE clients
	go startProviderEventSubscriber(ctx, rdb, sseHub, log)

	// Consumer SSE event subscriber — listens to domain events and pushes to consumer (web app) clients
	go startConsumerEventSubscriber(ctx, rdb, db, sseHub, log)

	// Presence refresh ticker
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				wsHub.refreshPresence(ctx)
			}
		}
	}()

	mux := http.NewServeMux()

	// Middleware chain: CORS → RBAC → Tenant-scoping → handler
	handler := corsMiddleware(rbacMiddleware(cfg.JWTSecret, log, tenantMiddleware(db, log, mux)))

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Auth endpoints
	mux.HandleFunc("/api/auth/login", handleLogin(svc, db, tokenSvc, cfg.JWTSecret, log))
	mux.HandleFunc("/api/auth/register", handleRegister(svc, db, tokenSvc, cfg.JWTSecret, log))
	mux.HandleFunc("/api/auth/me", handleMe(svc, tokenSvc, log))
	mux.HandleFunc("/api/auth/refresh", handleRefresh(svc, db, tokenSvc, cfg.JWTSecret, log))

	// ─── Password-reset + email-verification OTP flows ──────
	mux.HandleFunc("/api/auth/forgot-password", handleForgotPassword(db, log))
	mux.HandleFunc("/api/auth/reset-password", handleResetPassword(db, log))
	mux.HandleFunc("/api/auth/request-email-verification", handleRequestEmailVerification(db, tokenSvc, log))
	mux.HandleFunc("/api/auth/verify-email", handleVerifyEmail(db, log))

	// ─── Push token registration ─────────────────────────────
	mux.HandleFunc("/api/users/me/push-tokens", handleRegisterPushToken(db, tokenSvc, log))

	// ─── Customer document upload ────────────────────────────
	mux.HandleFunc("/api/documents/upload-url", handleDocumentUploadURL(db, tokenSvc, minioClient, log))
	mux.HandleFunc("/api/documents/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/confirm") {
			handleConfirmDocumentUpload(db, tokenSvc, log)(w, r)
			return
		}
		http.NotFound(w, r)
	})
	// Friend request endpoints
	mux.HandleFunc("/api/friends/request", handleFriendRequest(db, tokenSvc, log, sseHub))
	mux.HandleFunc("/api/friends/requests", handleListFriendRequests(db, tokenSvc, log))
	mux.HandleFunc("/api/friends/respond", handleRespondFriendRequest(db, tokenSvc, log, sseHub))
	mux.HandleFunc("/api/friends", handleListFriends(db, tokenSvc, log))
	mux.HandleFunc("/api/friends/remove", handleRemoveFriend(db, tokenSvc, log))

	// Notification endpoints
	mux.HandleFunc("/api/notifications", handleListNotifications(svc, tokenSvc, log))
	mux.HandleFunc("/api/notifications/read", handleMarkNotificationsRead(db, tokenSvc, log))
	mux.HandleFunc("/api/notifications/stream", handleSSEStream(tokenSvc, log, sseHub))

	// Chat dependencies (shared across chat handlers)
	chatD := &chatDeps{
		db:       db,
		hub:      wsHub,
		sseHub:   sseHub,
		log:      log,
		tokenSvc: tokenSvc,
		svc:      svc,
	}

	// WebSocket endpoint
	mux.HandleFunc("/api/ws", handleWebSocket(chatD))

	// Chat conversation endpoints
	mux.HandleFunc("/api/conversations", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handleListConversations(chatD)(w, r)
		case http.MethodPost:
			handleCreateConversation(chatD)(w, r)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	})
	mux.HandleFunc("/api/conversations/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		switch {
		case strings.HasSuffix(path, "/messages"):
			if r.Method == http.MethodGet {
				handleListMessages(chatD)(w, r)
			} else if r.Method == http.MethodPost {
				handleSendMessageREST(chatD)(w, r)
			} else {
				writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			}
		case strings.HasSuffix(path, "/read"):
			handleMarkConversationRead(chatD)(w, r)
		default:
			handleConversationByID(chatD)(w, r)
		}
	})

	// Message endpoints (get/edit/delete/reactions)
	mux.HandleFunc("/api/messages/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.Contains(path, "/reactions") {
			if r.Method == http.MethodPost {
				handleAddReactionREST(chatD)(w, r)
			} else if r.Method == http.MethodDelete {
				handleRemoveReactionREST(chatD)(w, r)
			} else {
				writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			}
			return
		}
		if r.Method == http.MethodGet {
			handleGetMessageREST(chatD)(w, r)
		} else if r.Method == http.MethodPut {
			handleEditMessageREST(chatD)(w, r)
		} else if r.Method == http.MethodDelete {
			handleDeleteMessageREST(chatD)(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	})

	// File upload/serve endpoints
	mux.HandleFunc("/api/upload", handleUploadFile(chatD, minioClient))
	mux.HandleFunc("/api/files/", handleServeFile(chatD, minioClient))

	// Signed document download URL (15-min expiry)
	mux.HandleFunc("/api/documents/signed-url/", handleSignedDocumentURL(db, tokenSvc, minioClient, log))

	// Avatar upload/remove/serve endpoints
	// Order matters: exact paths registered before the prefix catch-all.
	mux.HandleFunc("/api/avatar/upload", handleAvatarUpload(chatD, minioClient))
	mux.HandleFunc("/api/avatar/me", handleAvatarRemove(chatD, minioClient))
	mux.HandleFunc("/api/avatar/", handleAvatarServe(chatD, minioClient))

	// Profile endpoints
	mux.HandleFunc("/api/profile/stats", handleProfileStats(db, tokenSvc, log))
	mux.HandleFunc("/api/profile/service-providers", handleProfileSPs(db, tokenSvc, log))
	mux.HandleFunc("/api/profile/activity", handleProfileActivity(db, tokenSvc, log))
	mux.HandleFunc("/api/profile", handleGetProfile(db, tokenSvc, log))
	mux.HandleFunc("/api/profile/update", handleUpdateProfile(db, tokenSvc, log))

	// Career endpoints
	mux.HandleFunc("/api/career", handleGetCareer(db, tokenSvc, log))
	mux.HandleFunc("/api/career/work", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteWork(db, tokenSvc, log)(w, r)
		} else {
			handleUpsertWork(db, tokenSvc, log)(w, r)
		}
	})
	mux.HandleFunc("/api/career/education", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteEducation(db, tokenSvc, log)(w, r)
		} else {
			handleUpsertEducation(db, tokenSvc, log)(w, r)
		}
	})
	mux.HandleFunc("/api/career/skills", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handleDeleteSkill(db, tokenSvc, log)(w, r)
		} else {
			handleAddSkill(db, tokenSvc, log)(w, r)
		}
	})

	// Privacy preferences
	mux.HandleFunc("/api/privacy/preferences", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetPrivacyPreferences(svc, tokenSvc, log)(w, r)
		} else if r.Method == http.MethodPatch {
			handleUpdatePrivacyPreferences(svc, tokenSvc, log)(w, r)
		} else {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	})

	// Sessions info
	mux.HandleFunc("/api/sessions", handleSessions(db, tokenSvc, log))

	// Presence endpoints (heartbeat must be registered before the prefix route)
	mux.HandleFunc("/api/presence/heartbeat", handlePresenceHeartbeat(chatD))
	mux.HandleFunc("/api/presence", handlePresenceQuery(chatD))

	// XMPP WebSocket proxy – the browser cannot reach ejabberd:5280 directly
	// when the app is accessed via Tailscale or another external hostname
	// (mixed-content block, cross-origin port, etc.).  This endpoint runs on the
	// same origin as the BFF so the browser can connect to it without issues.
	ejabberdWS := getEnvOrDefault("EJABBERD_WS_URL", "ws://localhost:5280/ws")
	mux.HandleFunc("/api/xmpp-ws", handleXMPPWSProxy(ejabberdWS, log))

	// ─── ejabberd internal hook endpoints ────────────────────────────────────
	// Only callable from within the Docker network (ejabberd → gateway).
	// Protected by EJABBERD_HOOK_SECRET header when the env var is set.
	ejHookDeps := &ejabberdHookDeps{
		db:             db,
		log:            log,
		internalSecret: getEnvOrDefault("EJABBERD_HOOK_SECRET", ""),
	}
	mux.HandleFunc("/internal/ejabberd/check_password", handleEjabberdCheckPassword(ejHookDeps))
	mux.HandleFunc("/internal/ejabberd/is_user", handleEjabberdIsUser(ejHookDeps))

	// ─── Team Management endpoints (JWT-authenticated) ──────────────────────
	mux.HandleFunc("/api/team/members", handleTeamMembers(svc, tokenSvc, log))
	mux.HandleFunc("/api/team/invitations", handleTeamInvitations(svc, tokenSvc, log))
	mux.HandleFunc("/api/team/invitations/revoke", handleRevokeInvitation(svc, tokenSvc, log))
	mux.HandleFunc("/api/team/invitations/accept", handleAcceptInvitation(svc, tokenSvc, log))
	mux.HandleFunc("/api/team/members/role", handleChangeTeamMemberRole(svc, tokenSvc, log))

	// ─── GraphQL (gqlgen) ─────────────────────────────────────
	gqlSrv := gqlhandler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{
		Resolvers: &resolver.Resolver{
			Clients: svc,
			Log:     log,
			DB:      db,
		},
	}))
	mux.Handle("/graphql", gqlSrv)

	// GraphQL Playground (development only)
	if cfg.LogLevel == "debug" {
		mux.Handle("/playground", playground.Handler("GraphQL Playground", "/graphql"))
	}

	// ─── Provider API (v1) — API-key authenticated, rate-limited ─────
	rl := newRateLimiter(500.0/60.0, 50) // 500 req/min sustained, burst of 50
	providerMux := http.NewServeMux()
	providerMux.HandleFunc("/api/v1/notifications", handleProviderNotifications(svc, db, log))
	providerMux.HandleFunc("/api/v1/notifications/", handleProviderNotifications(svc, db, log))
	providerMux.HandleFunc("/api/v1/callbacks", handleProviderCallbacks(svc, db, rdb, log))
	providerMux.HandleFunc("/api/v1/callbacks/", handleProviderCallbacks(svc, db, rdb, log))
	providerMux.HandleFunc("/api/v1/messages", handleProviderMessages(svc, db, log))
	providerMux.HandleFunc("/api/v1/messages/", handleProviderMessages(svc, db, log))
	providerMux.HandleFunc("/api/v1/documents", handleProviderDocumentsAll(svc, db, log, minioClient))
	providerMux.HandleFunc("/api/v1/documents/", handleProviderDocumentsAll(svc, db, log, minioClient))
	providerMux.HandleFunc("/api/v1/campaigns", handleProviderCampaigns(svc, db, log))
	providerMux.HandleFunc("/api/v1/campaigns/", handleProviderCampaigns(svc, db, log))
	providerMux.HandleFunc("/api/v1/webhooks", handleProviderWebhooks(svc, db, log))
	providerMux.HandleFunc("/api/v1/webhooks/", handleProviderWebhooks(svc, db, log))
	providerMux.HandleFunc("/api/v1/analytics", handleProviderAnalytics(svc, db, log))
	providerMux.HandleFunc("/api/v1/analytics/", handleProviderAnalytics(svc, db, log))
	providerMux.HandleFunc("/api/v1/customers", handleProviderCustomers(db, log))
	providerMux.HandleFunc("/api/v1/customers/", handleProviderCustomers(db, log))
	providerMux.HandleFunc("/api/v1/policy/check", handleProviderPolicyCheck(db, log))
	providerMux.HandleFunc("/api/v1/service-providers", handleProviderSPProfile(db, log))
	providerMux.HandleFunc("/api/v1/service-providers/", handleProviderSPProfile(db, log))

	providerHandler := apiKeyAuth(db, tokenSvc, log, rateLimitMiddleware(rl, log, providerMux))
	mux.Handle("/api/v1/", providerHandler)

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
	// Allowed origins — configurable via CORS_ALLOWED_ORIGINS env var
	// (comma-separated).  Defaults to development origins.
	allowedOrigins := map[string]bool{
		"http://localhost:3000": true,
		"http://localhost:3001": true,
		"http://localhost:3002": true,
		"http://localhost:6060": true,
		"http://localhost:8080": true,
	}
	if extra := os.Getenv("CORS_ALLOWED_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				allowedOrigins[o] = true
			}
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Only reflect the origin if it is in the allowlist.
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key, X-Request-ID")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
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
	XMPPToken    string       `json:"xmppToken"`
	XMPPJid      string       `json:"xmppJid"`
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

func handleLogin(svc *clients.ServiceClients, db *sql.DB, tokenSvc *jwt.TokenService, jwtSecret string, log *zap.Logger) http.HandlerFunc {
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

		// Delegate authentication to auth-service via gRPC
		loginResp, err := svc.Auth.Login(r.Context(), &authpb.LoginRequest{
			Email:    req.Email,
			Password: req.Password,
		})
		if err != nil {
			st := status.Convert(err)
			switch st.Code() {
			case codes.Unauthenticated:
				writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid credentials"})
			case codes.PermissionDenied:
				writeJSON(w, http.StatusForbidden, errorResponse{Error: "account is not active"})
			default:
				log.Error("auth-service login failed", zap.Error(err))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			}
			return
		}

		// Fetch full profile data from user-service
		var email, fullName, username, virtualPublicID string
		profileResp, profileErr := svc.User.GetUserProfile(r.Context(), &userpb.GetUserProfileRequest{
			UserId: loginResp.UserId,
		})
		if profileErr != nil {
			// Profile row may not exist (registered before this fix). Create it from
			// the users table so subsequent calls succeed.
			var dbEmail, dbUsername sql.NullString
			row := db.QueryRowContext(r.Context(),
				`SELECT email, username FROM users WHERE id = $1`,
				loginResp.UserId,
			)
			if row.Scan(&dbEmail, &dbUsername) == nil {
				email = dbEmail.String
				username = dbUsername.String
			}
			// Try to get full_name from user_profiles (may not exist yet)
			var dbFullName sql.NullString
			_ = db.QueryRowContext(r.Context(),
				`SELECT full_name FROM user_profiles WHERE user_id = $1`,
				loginResp.UserId,
			).Scan(&dbFullName)
			fullName = dbFullName.String

			// Try to get virtual_public_id from user_identities
			var dbVpid sql.NullString
			_ = db.QueryRowContext(r.Context(),
				`SELECT virtual_public_id FROM user_identities WHERE user_id = $1 AND is_active = true LIMIT 1`,
				loginResp.UserId,
			).Scan(&dbVpid)
			virtualPublicID = dbVpid.String

			// Backfill user_profiles row if it doesn't exist and we have a name
			if fullName == "" && email != "" {
				// Use username as fallback for full_name (NOT NULL column)
				fallbackName := username
				if fallbackName == "" {
					fallbackName = email
				}
				_, _ = db.ExecContext(r.Context(),
					`INSERT INTO user_profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
					loginResp.UserId, fallbackName,
				)
				fullName = fallbackName
			}
			log.Warn("user-service GetUserProfile failed, backfilled from users table", zap.Error(profileErr))
		} else {
			email = profileResp.Email
			fullName = profileResp.FullName
			username = profileResp.Username
			virtualPublicID = profileResp.VirtualPublicId
		}

		// Generate XMPP JWT — gateway-specific concern for ejabberd integration
		xmppJid := loginResp.UserId + "@" + xmppDomain
		xmppClaims := gojwt.MapClaims{
			"sub": loginResp.UserId,
			"jid": xmppJid,
			"iat": time.Now().Unix(),
			"exp": time.Now().Add(24 * time.Hour).Unix(),
		}
		xmppJWTObj := gojwt.NewWithClaims(gojwt.SigningMethodHS256, xmppClaims)
		xmppToken, xmppErr := xmppJWTObj.SignedString([]byte(jwtSecret))
		if xmppErr != nil {
			log.Error("failed to generate xmpp jwt", zap.Error(xmppErr))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		// Persist XMPP JID and token hash for ejabberd check_password hook
		xmppTokenHash := sha256.Sum256([]byte(xmppToken))
		xmppTokenHashHex := hex.EncodeToString(xmppTokenHash[:])
		_, _ = db.ExecContext(r.Context(),
			`UPDATE users SET xmpp_jid = $1, xmpp_token_hash = $2 WHERE id = $3`,
			xmppJid, xmppTokenHashHex, loginResp.UserId,
		)

		log.Info("user logged in", zap.String("user_id", loginResp.UserId), zap.String("username", username))

		writeJSON(w, http.StatusOK, authResponse{
			AccessToken:  loginResp.AccessToken,
			RefreshToken: loginResp.RefreshToken,
			XMPPToken:    xmppToken,
			XMPPJid:      xmppJid,
			User: userResponse{
				ID:              loginResp.UserId,
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
		b[i] = chars[mathrand.Intn(len(chars))]
	}
	return "TI-" + string(b)
}

func handleRegister(svc *clients.ServiceClients, db *sql.DB, tokenSvc *jwt.TokenService, jwtSecret string, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		var req registerRequest
		ct := r.Header.Get("Content-Type")
		if strings.HasPrefix(ct, "multipart/form-data") {
			// Parse multipart: JSON payload is in the "payload" form field
			if err := r.ParseMultipartForm(32 << 20); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid multipart body"})
				return
			}
			payloadStr := r.FormValue("payload")
			if payloadStr == "" {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing payload field"})
				return
			}
			if err := json.Unmarshal([]byte(payloadStr), &req); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
		} else {
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
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

		// Delegate registration to auth-service via gRPC
		regResp, err := svc.Auth.Register(r.Context(), &authpb.RegisterRequest{
			Username: rawUsername,
			Email:    req.Email,
			Mobile:   req.Mobile,
			Password: req.Password,
			FullName: req.FullName,
		})
		if err != nil {
			st := status.Convert(err)
			switch st.Code() {
			case codes.AlreadyExists:
				writeJSON(w, http.StatusConflict, errorResponse{Error: st.Message()})
			case codes.InvalidArgument:
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: st.Message()})
			default:
				log.Error("auth-service register failed", zap.Error(err))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			}
			return
		}

		// Create user_profiles row (user-service GetUserProfile queries this table)
		_, profileErr := db.ExecContext(r.Context(),
			`INSERT INTO user_profiles (user_id, full_name) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
			regResp.UserId, req.FullName,
		)
		if profileErr != nil {
			log.Warn("failed to create user_profiles row", zap.Error(profileErr))
		}

		// Generate XMPP JWT (same as handleLogin)
		xmppJid := regResp.UserId + "@" + xmppDomain
		xmppClaims := gojwt.MapClaims{
			"sub": regResp.UserId,
			"jid": xmppJid,
			"iat": time.Now().Unix(),
			"exp": time.Now().Add(24 * time.Hour).Unix(),
		}
		xmppJWTObj := gojwt.NewWithClaims(gojwt.SigningMethodHS256, xmppClaims)
		xmppToken, xmppErr := xmppJWTObj.SignedString([]byte(jwtSecret))
		if xmppErr != nil {
			log.Error("failed to generate xmpp jwt for registration", zap.Error(xmppErr))
		}

		// Persist XMPP JID and token hash
		if xmppToken != "" {
			xmppTokenHash := sha256.Sum256([]byte(xmppToken))
			xmppTokenHashHex := hex.EncodeToString(xmppTokenHash[:])
			_, _ = db.ExecContext(r.Context(),
				`UPDATE users SET xmpp_jid = $1, xmpp_token_hash = $2 WHERE id = $3`,
				xmppJid, xmppTokenHashHex, regResp.UserId,
			)
		}

		log.Info("user registered", zap.String("user_id", regResp.UserId), zap.String("username", regResp.Username))

		writeJSON(w, http.StatusCreated, authResponse{
			AccessToken:  regResp.AccessToken,
			RefreshToken: regResp.RefreshToken,
			XMPPToken:    xmppToken,
			XMPPJid:      xmppJid,
			User: userResponse{
				ID:              regResp.UserId,
				Email:           req.Email,
				FullName:        req.FullName,
				Username:        regResp.Username,
				VirtualPublicID: regResp.VirtualPublicId,
			},
		})
	}
}

func handleMe(svc *clients.ServiceClients, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

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

		// Fetch profile from user-service via gRPC
		profileResp, err := svc.User.GetUserProfile(r.Context(), &userpb.GetUserProfileRequest{
			UserId: claims.UserID,
		})
		if err != nil {
			log.Error("user-service GetUserProfile failed", zap.Error(err))
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "user not found"})
			return
		}

		writeJSON(w, http.StatusOK, userResponse{
			ID:              profileResp.UserId,
			Email:           profileResp.Email,
			FullName:        profileResp.FullName,
			Username:        profileResp.Username,
			VirtualPublicID: profileResp.VirtualPublicId,
		})
	}
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

func handleRefresh(svc *clients.ServiceClients, db *sql.DB, tokenSvc *jwt.TokenService, jwtSecret string, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		var req refreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "refreshToken is required"})
			return
		}

		// Delegate token refresh to auth-service via gRPC
		resp, err := svc.Auth.RefreshToken(r.Context(), &authpb.RefreshTokenRequest{
			RefreshToken: req.RefreshToken,
		})
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid or expired refresh token"})
			return
		}

		// Extract user ID from the new access token to regenerate XMPP token
		claims, claimsErr := tokenSvc.ValidateAccessToken(resp.AccessToken)
		var xmppToken, xmppJid string
		if claimsErr == nil {
			xmppJid = claims.UserID + "@" + xmppDomain
			xmppClaims := gojwt.MapClaims{
				"sub": claims.UserID,
				"jid": xmppJid,
				"iat": time.Now().Unix(),
				"exp": time.Now().Add(24 * time.Hour).Unix(),
			}
			xmppJWTObj := gojwt.NewWithClaims(gojwt.SigningMethodHS256, xmppClaims)
			xmppToken, _ = xmppJWTObj.SignedString([]byte(jwtSecret))

			if xmppToken != "" {
				xmppTokenHash := sha256.Sum256([]byte(xmppToken))
				xmppTokenHashHex := hex.EncodeToString(xmppTokenHash[:])
				_, _ = db.ExecContext(r.Context(),
					`UPDATE users SET xmpp_jid = $1, xmpp_token_hash = $2 WHERE id = $3`,
					xmppJid, xmppTokenHashHex, claims.UserID,
				)
			}
		}

		log.Info("token refreshed via gRPC")
		result := map[string]string{
			"accessToken":  resp.AccessToken,
			"refreshToken": resp.RefreshToken,
		}
		if xmppToken != "" {
			result["xmppToken"] = xmppToken
			result["xmppJid"] = xmppJid
		}
		writeJSON(w, http.StatusOK, result)
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
	spID   string // service provider scope (empty for consumer users)
	ch     chan []byte
}

type sseHub struct {
	mu        sync.RWMutex
	clients   map[string][]*sseClient // userID → clients
	spClients map[string][]*sseClient // spID   → clients
}

func newSSEHub() *sseHub {
	return &sseHub{
		clients:   make(map[string][]*sseClient),
		spClients: make(map[string][]*sseClient),
	}
}

func (h *sseHub) register(c *sseClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[c.userID] = append(h.clients[c.userID], c)
	if c.spID != "" {
		h.spClients[c.spID] = append(h.spClients[c.spID], c)
	}
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
	if c.spID != "" {
		spClients := h.spClients[c.spID]
		for i, cl := range spClients {
			if cl == c {
				h.spClients[c.spID] = append(spClients[:i], spClients[i+1:]...)
				break
			}
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
		}
	}
}

// sendToSP broadcasts an SSE event to all clients connected for a given service provider.
func (h *sseHub) sendToSP(spID string, eventType string, data interface{}) {
	payload, err := json.Marshal(data)
	if err != nil {
		return
	}
	msg := fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, string(payload))
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, c := range h.spClients[spID] {
		select {
		case c.ch <- []byte(msg):
		default:
		}
	}
}

func (h *sseHub) countSPClients(spID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.spClients[spID])
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
		spID := r.URL.Query().Get("serviceProviderId")
		if spID == "" {
			spID = claims.ServiceProviderID
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming not supported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no") // prevent nginx / Next.js proxy buffering
		sseOrigin := r.Header.Get("Origin")
		if sseOrigin == "" {
			sseOrigin = "http://localhost:3000"
		}
		w.Header().Set("Access-Control-Allow-Origin", sseOrigin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		client := &sseClient{userID: userID, spID: spID, ch: make(chan []byte, 16)}
		hub.register(client)
		defer hub.unregister(client)

		log.Info("SSE client connected", zap.String("user_id", userID), zap.String("sp_id", spID))

		// Send initial keepalive
		fmt.Fprintf(w, ": connected\n\n")
		flusher.Flush()

		ctx := r.Context()
		ticker := time.NewTicker(15 * time.Second) // 15s < typical 30s proxy timeout
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
		`INSERT INTO notifications (user_id, category, title, body, metadata, created_at)
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

// ==================== Provider SSE Event Subscriber ====================

// sseEventMap translates domain event types to SSE event names for the provider portal.
var sseEventMap = map[string]string{
	"callback.requested":         "callback_created",
	"callback.approved":          "callback_updated",
	"callback.rejected":          "callback_updated",
	"callback.expired":           "callback_updated",
	"notification.created":       "notification_delivered",
	"notification.delivered":     "notification_delivered",
	"notification.read":          "notification_read",
	"message.sent":               "message_received",
	"campaign.launched":          "campaign_progress",
	"campaign.completed":         "campaign_progress",
	"document.shared":            "document_shared",
	"webhook.delivery.succeeded": "webhook_delivery",
	"webhook.delivery.failed":    "webhook_delivery",
	"team.member.invited":        "team_update",
	"invitation.accepted":        "team_update",
	"team.member.role_changed":   "team_update",
}

// startProviderEventSubscriber subscribes to Redis Pub/Sub channels for domain
// events and pushes them to connected SSE provider clients scoped by service_provider_id.
func startProviderEventSubscriber(ctx context.Context, rdb *redis.Client, hub *sseHub, log *zap.Logger) {
	channels := make([]string, 0, len(sseEventMap))
	for domainType := range sseEventMap {
		channels = append(channels, "trustinbox:events:"+domainType)
	}

	pubsub := rdb.Subscribe(ctx, channels...)
	_, err := pubsub.Receive(ctx)
	if err != nil {
		log.Error("failed to subscribe to provider events", zap.Error(err))
		return
	}
	log.Info("provider event subscriber started", zap.Int("channels", len(channels)))

	ch := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			pubsub.Close()
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			var envelope struct {
				ID                string          `json:"id"`
				Type              string          `json:"type"`
				ServiceProviderID string          `json:"service_provider_id"`
				UserID            string          `json:"user_id"`
				EntityID          string          `json:"entity_id"`
				Payload           json.RawMessage `json:"payload"`
				OccurredAt        string          `json:"occurred_at"`
			}
			if err := json.Unmarshal([]byte(msg.Payload), &envelope); err != nil {
				log.Error("failed to unmarshal provider event", zap.Error(err))
				continue
			}

			log.Info("provider subscriber received event",
				zap.String("event_type", envelope.Type),
				zap.String("sp_id", envelope.ServiceProviderID),
				zap.String("user_id", envelope.UserID),
				zap.String("entity_id", envelope.EntityID),
			)

			sseType, ok := sseEventMap[envelope.Type]
			if !ok {
				continue
			}

			// Build the SSE payload
			notification := map[string]interface{}{
				"id":        envelope.ID,
				"eventType": envelope.Type,
				"entityId":  envelope.EntityID,
				"timestamp": envelope.OccurredAt,
			}
			if len(envelope.Payload) > 0 && string(envelope.Payload) != "null" {
				var payloadData map[string]interface{}
				if err := json.Unmarshal(envelope.Payload, &payloadData); err == nil {
					for k, v := range payloadData {
						notification[k] = v
					}
				}
			}

			// Route to the correct SP
			spID := envelope.ServiceProviderID
			if spID != "" {
				log.Info("dispatching SSE to SP",
					zap.String("sp_id", spID),
					zap.String("sse_type", sseType),
					zap.Int("sp_clients", hub.countSPClients(spID)),
				)
				hub.sendToSP(spID, sseType, notification)
			}
			// Also send to the user who triggered the event (for cross-device sync)
			if envelope.UserID != "" {
				hub.send(envelope.UserID, sseType, notification)
			}
		}
	}
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

		var senderName string
		db.QueryRow(`SELECT COALESCE(p.full_name, u.username) FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id = $1`, senderID).Scan(&senderName)

		if input.Action == "accept" {
			// Notify the original sender that their request was accepted
			createNotification(db, hub, senderID, "FRIEND_ACCEPTED",
				"Connection Accepted",
				fmt.Sprintf("%s accepted your connection request", responderName),
				map[string]string{"friendId": userID, "friendName": responderName},
			)
			// Notify the acceptor so their UI updates in real-time
			createNotification(db, hub, userID, "FRIEND_ACCEPTED",
				"New Connection",
				fmt.Sprintf("You are now connected with %s", senderName),
				map[string]string{"friendId": senderID, "friendName": senderName},
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

func handleListNotifications(svc *clients.ServiceClients, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
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

		// Fetch notifications from notification-service via gRPC
		resp, err := svc.Notification.ListNotifications(r.Context(), &notifpb.ListNotificationsRequest{
			UserId: userID,
			Limit:  50,
		})
		if err != nil {
			log.Error("notification-service ListNotifications failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		results := make([]notificationResponse, 0, len(resp.Notifications))
		for _, n := range resp.Notifications {
			nr := notificationResponse{
				ID:    n.Id,
				Type:  n.Category,
				Title: n.Title,
				Body:  n.Body,
				Read:  n.Status == "READ",
			}
			if n.CreatedAt != nil {
				nr.CreatedAt = n.CreatedAt.AsTime().Format(time.RFC3339)
			}
			if len(n.Metadata) > 0 {
				metaJSON, _ := json.Marshal(n.Metadata)
				nr.Data = json.RawMessage(metaJSON)
			}
			results = append(results, nr)
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
			_, err = db.Exec(`UPDATE notifications SET status = 'READ' WHERE user_id = $1 AND status != 'READ'`, userID)
		} else if len(input.IDs) > 0 {
			// Mark specific ones
			for _, id := range input.IDs {
				db.Exec(`UPDATE notifications SET status = 'READ' WHERE id = $1 AND user_id = $2`, id, userID)
			}
		}

		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to mark read"})
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}

// ==================== Consumer SSE Event Subscriber ====================

// consumerEventLabels maps domain event types to human-readable labels for consumer-facing notifications.
var consumerEventLabels = map[string]struct{ Title, Body string }{
	"notification.created":   {"New Notification", "You have a new notification from a service provider"},
	"notification.delivered": {"Notification Delivered", "A notification has been delivered to you"},
	"callback.approved":      {"Callback Approved", "Your callback request has been approved"},
	"callback.rejected":      {"Callback Declined", "Your callback request was declined"},
	"callback.expired":       {"Callback Expired", "A callback request has expired"},
	"message.sent":           {"New Message", "You have a new message"},
	"document.shared":        {"Document Shared", "A document has been shared with you"},
}

// isUserInDND checks whether a user has an active GLOBAL DND rule matching the current time.
func isUserInDND(ctx context.Context, db *sql.DB, userID string) bool {
	rows, err := db.QueryContext(ctx,
		`SELECT start_time, end_time, days_of_week
		 FROM dnd_rules
		 WHERE user_id = $1 AND is_active = true AND scope_type = 'GLOBAL'`, userID)
	if err != nil {
		return false
	}
	defer rows.Close()

	now := time.Now()
	currentDay := int(now.Weekday()) // 0=Sunday
	currentMinutes := now.Hour()*60 + now.Minute()

	for rows.Next() {
		var startStr, endStr string
		var daysArr []int64
		if err := rows.Scan(&startStr, &endStr, pq.Array(&daysArr)); err != nil {
			continue
		}

		// Check if today is in the DND days list (empty = every day)
		if len(daysArr) > 0 {
			dayMatch := false
			for _, d := range daysArr {
				if int(d) == currentDay {
					dayMatch = true
					break
				}
			}
			if !dayMatch {
				continue
			}
		}

		startParts := parseHHMM(startStr)
		endParts := parseHHMM(endStr)
		if startParts < 0 || endParts < 0 {
			continue
		}

		// Handle overnight ranges (e.g., 22:00 → 07:00)
		if startParts <= endParts {
			if currentMinutes >= startParts && currentMinutes < endParts {
				return true
			}
		} else {
			if currentMinutes >= startParts || currentMinutes < endParts {
				return true
			}
		}
	}
	return false
}

// parseHHMM converts "HH:MM" to minutes since midnight, returns -1 on error.
func parseHHMM(s string) int {
	if len(s) < 5 || s[2] != ':' {
		return -1
	}
	h := int(s[0]-'0')*10 + int(s[1]-'0')
	m := int(s[3]-'0')*10 + int(s[4]-'0')
	if h > 23 || m > 59 {
		return -1
	}
	return h*60 + m
}

// isUserSoundEnabled checks whether a user has notification sounds enabled (defaults to true).
func isUserSoundEnabled(ctx context.Context, db *sql.DB, userID string) bool {
	var enabled bool
	err := db.QueryRowContext(ctx,
		`SELECT notification_sound_enabled FROM privacy_preferences WHERE user_id = $1`, userID,
	).Scan(&enabled)
	if err != nil {
		return true // default: sound enabled
	}
	return enabled
}

// startConsumerEventSubscriber listens to domain events via Redis Pub/Sub and pushes
// notifications to consumer (web app) SSE clients, enriched with DND and sound preference status.
func startConsumerEventSubscriber(ctx context.Context, rdb *redis.Client, db *sql.DB, hub *sseHub, log *zap.Logger) {
	channels := make([]string, 0, len(consumerEventLabels))
	for domainType := range consumerEventLabels {
		channels = append(channels, "trustinbox:events:"+domainType)
	}

	pubsub := rdb.Subscribe(ctx, channels...)
	_, err := pubsub.Receive(ctx)
	if err != nil {
		log.Error("failed to subscribe to consumer events", zap.Error(err))
		return
	}
	log.Info("consumer event subscriber started", zap.Int("channels", len(channels)))

	ch := pubsub.Channel()
	for {
		select {
		case <-ctx.Done():
			pubsub.Close()
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}
			var envelope struct {
				ID                string          `json:"id"`
				Type              string          `json:"type"`
				ServiceProviderID string          `json:"service_provider_id"`
				UserID            string          `json:"user_id"`
				EntityID          string          `json:"entity_id"`
				Payload           json.RawMessage `json:"payload"`
				OccurredAt        string          `json:"occurred_at"`
			}
			if err := json.Unmarshal([]byte(msg.Payload), &envelope); err != nil {
				log.Error("failed to unmarshal consumer event", zap.Error(err))
				continue
			}

			labels, ok := consumerEventLabels[envelope.Type]
			if !ok || envelope.UserID == "" {
				continue
			}

			// Enrich with DND and sound preference
			suppressed := isUserInDND(ctx, db, envelope.UserID)
			soundEnabled := isUserSoundEnabled(ctx, db, envelope.UserID)

			// Extract title/body from payload if available, fallback to defaults
			title := labels.Title
			body := labels.Body
			if len(envelope.Payload) > 0 && string(envelope.Payload) != "null" {
				var payloadData map[string]interface{}
				if err := json.Unmarshal(envelope.Payload, &payloadData); err == nil {
					if t, ok := payloadData["title"].(string); ok && t != "" {
						title = t
					}
					if b, ok := payloadData["body"].(string); ok && b != "" {
						body = b
					}
				}
			}

			notification := map[string]interface{}{
				"id":           envelope.ID,
				"type":         envelope.Type,
				"title":        title,
				"body":         body,
				"read":         false,
				"createdAt":    envelope.OccurredAt,
				"suppressed":   suppressed,
				"soundEnabled": soundEnabled,
				"entityId":     envelope.EntityID,
			}

			hub.send(envelope.UserID, "notification", notification)
		}
	}
}
