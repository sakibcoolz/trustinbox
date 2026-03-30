package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/trustinbox/cornerstone/auth/jwt"
	"go.uber.org/zap"
)

const signedURLExpiry = 15 * time.Minute

// handleSignedDocumentURL generates a presigned S3 URL for a document download.
// The URL expires after 15 minutes.
//
//	GET /api/documents/signed-url/{document_id}
//
// Requires a valid JWT.  The caller must be the document owner or a user
// the document has been shared with.
func handleSignedDocumentURL(db *sql.DB, tokenSvc *jwt.TokenService, mc *minio.Client, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		// Authenticate
		claims, err := authenticateRequest(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		// Extract document ID from path
		docID := strings.TrimPrefix(r.URL.Path, "/api/documents/signed-url/")
		docID = strings.TrimSuffix(docID, "/")
		if docID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "document id required"})
			return
		}

		// Look up document — ensure caller has access.
		var s3Key string
		var fileName string

		// First check: document shared with user.
		err = db.QueryRowContext(r.Context(),
			`SELECT d.s3_key, d.file_name
			   FROM documents d
			   JOIN document_shares ds ON ds.document_id = d.id
			  WHERE d.id = $1 AND ds.user_id = $2`,
			docID, claims.UserID,
		).Scan(&s3Key, &fileName)

		if err == sql.ErrNoRows {
			// Second check: user uploaded the document (SP user).
			err = db.QueryRowContext(r.Context(),
				`SELECT d.s3_key, d.file_name
				   FROM documents d
				   JOIN service_provider_users spu ON spu.service_provider_id = d.service_provider_id
				  WHERE d.id = $1 AND spu.user_id = $2`,
				docID, claims.UserID,
			).Scan(&s3Key, &fileName)
		}

		if err != nil {
			if err == sql.ErrNoRows {
				writeJSON(w, http.StatusNotFound, errorResponse{Error: "document not found or access denied"})
			} else {
				log.Error("signed-url: DB error", zap.Error(err))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			}
			return
		}

		if mc == nil {
			writeJSON(w, http.StatusServiceUnavailable, errorResponse{Error: "object storage not configured"})
			return
		}

		// Generate presigned URL (15-min expiry).
		bucket := getEnvOrDefault("MINIO_BUCKET", "trustinbox")
		presignedURL, err := mc.PresignedGetObject(context.Background(), bucket, s3Key, signedURLExpiry, nil)
		if err != nil {
			log.Error("signed-url: presign failed", zap.Error(err), zap.String("s3_key", s3Key))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to generate download URL"})
			return
		}

		// Record download attempt.
		go func() {
			_, _ = db.Exec(
				`UPDATE document_shares SET opened_at = COALESCE(opened_at, NOW()) WHERE document_id = $1 AND user_id = $2`,
				docID, claims.UserID,
			)
		}()

		resp := struct {
			URL       string `json:"url"`
			FileName  string `json:"fileName"`
			ExpiresAt string `json:"expiresAt"`
		}{
			URL:       presignedURL.String(),
			FileName:  fileName,
			ExpiresAt: time.Now().Add(signedURLExpiry).UTC().Format(time.RFC3339),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)
	}
}

// authenticateRequest extracts and validates a JWT from the Authorization header.
func authenticateRequest(r *http.Request, tokenSvc *jwt.TokenService) (*jwt.Claims, error) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return nil, http.ErrNoCookie // reuse as generic sentinel
	}
	tokenStr := strings.TrimPrefix(auth, "Bearer ")
	claims, err := tokenSvc.ValidateAccessToken(tokenStr)
	if err != nil {
		return nil, err
	}
	return claims, nil
}
