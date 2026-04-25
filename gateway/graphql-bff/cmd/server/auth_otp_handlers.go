package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/trustinbox/cornerstone/auth/jwt"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// ─── OTP constants ────────────────────────────────────────────

const (
	otpPurposePasswordReset     = "password_reset"
	otpPurposeEmailVerification = "email_verification"
	otpTTL                      = 10 * time.Minute
	otpDigits                   = 6
)

// ─── OTP helpers ──────────────────────────────────────────────

func generateOTP() (string, error) {
	max := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(otpDigits)), nil)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%0*d", otpDigits, n.Int64()), nil
}

func hashOTPValue(otp string) string {
	h := sha256.Sum256([]byte(otp))
	return hex.EncodeToString(h[:])
}

// storeOTP invalidates prior OTPs for this user+purpose then writes a new one.
func storeOTP(ctx context.Context, db *sql.DB, userID, purpose, otpHash string) error {
	_, err := db.ExecContext(ctx,
		`UPDATE otps SET used_at = NOW()
		  WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
		userID, purpose,
	)
	if err != nil {
		return fmt.Errorf("invalidate old otps: %w", err)
	}
	_, err = db.ExecContext(ctx,
		`INSERT INTO otps (id, user_id, otp_hash, purpose, expires_at)
		      VALUES ($1, $2, $3, $4, $5)`,
		uuid.New().String(), userID, otpHash, purpose, time.Now().Add(otpTTL),
	)
	return err
}

// verifyAndConsumeOTP returns true if the OTP is valid (not expired, not used).
// On success it marks the OTP as used.
func verifyAndConsumeOTP(ctx context.Context, db *sql.DB, userID, purpose, otp string) (bool, error) {
	otpHash := hashOTPValue(otp)
	var otpID string
	err := db.QueryRowContext(ctx,
		`SELECT id FROM otps
		  WHERE user_id = $1 AND purpose = $2 AND otp_hash = $3
		    AND used_at IS NULL AND expires_at > NOW()
		  ORDER BY created_at DESC LIMIT 1`,
		userID, purpose, otpHash,
	).Scan(&otpID)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	_, err = db.ExecContext(ctx, `UPDATE otps SET used_at = NOW() WHERE id = $1`, otpID)
	return true, err
}

// logOTPForDev emits the plaintext OTP to the logger so developers can test
// without an email service. In production this log level should be disabled.
func logOTPForDev(log *zap.Logger, purpose, userID, otp string) {
	log.Info("[DEV] OTP generated — configure an email service for production",
		zap.String("purpose", purpose),
		zap.String("user_id", userID),
		zap.String("otp", otp),
	)
}

// ─── POST /api/auth/forgot-password ───────────────────────────
//
// Body: {"email":"user@example.com"}
// Always responds 200 to prevent email enumeration.
// In production, publish an event so a mailer service delivers the OTP.
func handleForgotPassword(db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		var req struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "email is required"})
			return
		}

		const okMsg = "If your email is registered, you will receive an OTP."

		var userID string
		err := db.QueryRowContext(r.Context(),
			`SELECT id FROM users WHERE email = $1`, req.Email,
		).Scan(&userID)
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusOK, map[string]string{"message": okMsg})
			return
		}
		if err != nil {
			log.Error("forgot-password: db lookup", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		otp, err := generateOTP()
		if err != nil {
			log.Error("forgot-password: generate otp", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		if err := storeOTP(r.Context(), db, userID, otpPurposePasswordReset, hashOTPValue(otp)); err != nil {
			log.Error("forgot-password: store otp", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		logOTPForDev(log, otpPurposePasswordReset, userID, otp)
		writeJSON(w, http.StatusOK, map[string]string{"message": okMsg})
	}
}

// ─── POST /api/auth/reset-password ────────────────────────────
//
// Body: {"email":"...", "otp":"123456", "newPassword":"..."}
func handleResetPassword(db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		var req struct {
			Email       string `json:"email"`
			OTP         string `json:"otp"`
			NewPassword string `json:"newPassword"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
			return
		}
		if req.Email == "" || req.OTP == "" || req.NewPassword == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "email, otp, and newPassword are required"})
			return
		}
		if len(req.NewPassword) < 8 {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "password must be at least 8 characters"})
			return
		}

		var userID string
		err := db.QueryRowContext(r.Context(),
			`SELECT id FROM users WHERE email = $1`, req.Email,
		).Scan(&userID)
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid OTP or email"})
			return
		}
		if err != nil {
			log.Error("reset-password: lookup", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		ok, err := verifyAndConsumeOTP(r.Context(), db, userID, otpPurposePasswordReset, req.OTP)
		if err != nil {
			log.Error("reset-password: verify otp", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		if !ok {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid or expired OTP"})
			return
		}

		hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			log.Error("reset-password: bcrypt", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		_, err = db.ExecContext(r.Context(),
			`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
			string(hash), userID,
		)
		if err != nil {
			log.Error("reset-password: update", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		log.Info("password reset successful", zap.String("user_id", userID))
		writeJSON(w, http.StatusOK, map[string]string{"message": "Password reset successful."})
	}
}

// ─── POST /api/auth/request-email-verification ────────────────
//
// Accepts an authenticated request (JWT) or body {"email":"..."}.
func handleRequestEmailVerification(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		var userID, email string

		claims, authErr := authenticateRequest(r, tokenSvc)
		if authErr == nil {
			userID = claims.UserID
			if err := db.QueryRowContext(r.Context(),
				`SELECT COALESCE(email,'') FROM users WHERE id = $1`, userID,
			).Scan(&email); err != nil {
				log.Error("request-email-verification: lookup by id", zap.Error(err))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
				return
			}
		} else {
			var req struct {
				Email string `json:"email"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "email is required"})
				return
			}
			email = req.Email
			if err := db.QueryRowContext(r.Context(),
				`SELECT id FROM users WHERE email = $1`, email,
			).Scan(&userID); err == sql.ErrNoRows {
				writeJSON(w, http.StatusOK, map[string]string{"message": "OTP sent if email is registered."})
				return
			} else if err != nil {
				log.Error("request-email-verification: lookup by email", zap.Error(err))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
				return
			}
		}

		var verified bool
		_ = db.QueryRowContext(r.Context(),
			`SELECT COALESCE(email_verified, false) FROM users WHERE id = $1`, userID,
		).Scan(&verified)
		if verified {
			writeJSON(w, http.StatusOK, map[string]string{"message": "Email already verified."})
			return
		}

		otp, err := generateOTP()
		if err != nil {
			log.Error("request-email-verification: generate otp", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		if err := storeOTP(r.Context(), db, userID, otpPurposeEmailVerification, hashOTPValue(otp)); err != nil {
			log.Error("request-email-verification: store otp", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		logOTPForDev(log, otpPurposeEmailVerification, userID, otp)
		writeJSON(w, http.StatusOK, map[string]string{"message": "OTP sent to your email."})
	}
}

// ─── POST /api/auth/verify-email ──────────────────────────────
//
// Body: {"email":"...", "otp":"123456"}
func handleVerifyEmail(db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		var req struct {
			Email string `json:"email"`
			OTP   string `json:"otp"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.OTP == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "email and otp are required"})
			return
		}

		var userID string
		if err := db.QueryRowContext(r.Context(),
			`SELECT id FROM users WHERE email = $1`, req.Email,
		).Scan(&userID); err == sql.ErrNoRows {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid OTP"})
			return
		} else if err != nil {
			log.Error("verify-email: lookup", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		ok, err := verifyAndConsumeOTP(r.Context(), db, userID, otpPurposeEmailVerification, req.OTP)
		if err != nil {
			log.Error("verify-email: verify otp", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		if !ok {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid or expired OTP"})
			return
		}

		_, err = db.ExecContext(r.Context(),
			`UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`, userID,
		)
		if err != nil {
			log.Error("verify-email: update", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		log.Info("email verified", zap.String("user_id", userID))
		writeJSON(w, http.StatusOK, map[string]string{"message": "Email verified successfully."})
	}
}

// ─── PUT /api/users/me/push-tokens ────────────────────────────
//
// Body: {"token":"<fcm|apns|web-vapid-token>", "platform":"fcm|apns|web"}
func handleRegisterPushToken(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut && r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		claims, err := authenticateRequest(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}
		var req struct {
			Token    string `json:"token"`
			Platform string `json:"platform"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Token == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "token is required"})
			return
		}
		if req.Platform == "" {
			req.Platform = "fcm"
		}
		_, err = db.ExecContext(r.Context(),
			`INSERT INTO push_tokens (id, user_id, token, platform)
			      VALUES ($1, $2, $3, $4)
			 ON CONFLICT (user_id, token)
			 DO UPDATE SET platform = EXCLUDED.platform, updated_at = NOW()`,
			uuid.New().String(), claims.UserID, req.Token, req.Platform,
		)
		if err != nil {
			log.Error("register-push-token: db", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		log.Info("push token registered",
			zap.String("user_id", claims.UserID),
			zap.String("platform", req.Platform),
		)
		writeJSON(w, http.StatusOK, map[string]string{"message": "Push token registered."})
	}
}

// ─── POST /api/documents/upload-url ───────────────────────────
//
// Returns a presigned MinIO PUT URL for direct client-side upload.
// Body: {"fileName":"...", "contentType":"...", "description":"..."}
func handleDocumentUploadURL(db *sql.DB, tokenSvc *jwt.TokenService, mc *minio.Client, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		claims, err := authenticateRequest(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}
		var req struct {
			FileName    string `json:"fileName"`
			ContentType string `json:"contentType"`
			Description string `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FileName == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "fileName is required"})
			return
		}
		if req.ContentType == "" {
			req.ContentType = "application/octet-stream"
		}
		if mc == nil {
			writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "object storage not configured"})
			return
		}

		docID := uuid.New().String()
		s3Key := fmt.Sprintf("user-docs/%s/%s", claims.UserID, docID)
		bucket := getEnvOrDefault("MINIO_BUCKET", "trustinbox")

		presignedURL, err := mc.PresignedPutObject(r.Context(), bucket, s3Key, 15*time.Minute)
		if err != nil {
			log.Error("document upload-url: presign", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to generate upload URL"})
			return
		}

		_, err = db.ExecContext(r.Context(),
			`INSERT INTO user_documents (id, user_id, file_name, content_type, s3_key, description, status, created_at, updated_at)
			      VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())`,
			docID, claims.UserID, req.FileName, req.ContentType, s3Key, req.Description,
		)
		if err != nil {
			log.Error("document upload-url: insert pending", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		log.Info("document upload URL generated",
			zap.String("user_id", claims.UserID),
			zap.String("doc_id", docID),
		)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"documentId": docID,
			"uploadUrl":  presignedURL.String(),
			"expiresAt":  time.Now().Add(15 * time.Minute).UTC().Format(time.RFC3339),
		})
	}
}

// ─── POST /api/documents/:id/confirm ──────────────────────────
//
// Activates a pending document after the client confirms the upload completed.
func handleConfirmDocumentUpload(db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost && r.Method != http.MethodPatch {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}
		claims, err := authenticateRequest(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}
		// Path: /api/documents/<id>/confirm
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/documents/"), "/")
		if len(parts) < 1 || parts[0] == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "document id required"})
			return
		}
		docID := parts[0]

		res, err := db.ExecContext(r.Context(),
			`UPDATE user_documents SET status = 'active', updated_at = NOW()
			  WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
			docID, claims.UserID,
		)
		if err != nil {
			log.Error("confirm-upload: db", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "document not found or already confirmed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "Document confirmed."})
	}
}
