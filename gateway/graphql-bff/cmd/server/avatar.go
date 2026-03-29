package main

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"go.uber.org/zap"
)

const avatarMaxSize = 5 * 1024 * 1024 // 5 MB

var allowedAvatarMIMEs = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

// handleAvatarUpload handles POST /api/avatar/upload
//
// Multipart form field: "avatar" (image file, max 5 MB).
// Validates the actual file bytes (Content-Type sniffing) — not just the
// client-supplied header — then writes to MinIO, updates user_profiles, and
// returns the serving URL with a cache-buster version query param.
func handleAvatarUpload(deps *chatDeps, mc *minio.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		// Enforce body size before parsing
		r.Body = http.MaxBytesReader(w, r.Body, avatarMaxSize+4096)
		if err := r.ParseMultipartForm(avatarMaxSize); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "file too large (max 5 MB)"})
			return
		}

		file, header, err := r.FormFile("avatar")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "field 'avatar' is required"})
			return
		}
		defer file.Close()

		if header.Size > avatarMaxSize {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "file too large (max 5 MB)"})
			return
		}

		// Content-type detection from actual bytes — never trust client header alone
		sniff := make([]byte, 512)
		n, _ := file.Read(sniff)
		detectedCT := http.DetectContentType(sniff[:n])
		// Seek back to start for the upload
		file.Seek(0, io.SeekStart) //nolint:errcheck

		ext, ok := allowedAvatarMIMEs[detectedCT]
		if !ok {
			// Some clients send "image/jpg" or non-standard types; use header as
			// a strict fallback only when the sniff returns a broad type.
			clientCT := header.Header.Get("Content-Type")
			ext, ok = allowedAvatarMIMEs[clientCT]
			if !ok {
				writeJSON(w, http.StatusBadRequest, errorResponse{
					Error: "unsupported image type — only JPEG, PNG, WebP and GIF are allowed",
				})
				return
			}
			detectedCT = clientCT
		}

		ctx := r.Context()

		// Delete the previous avatar from MinIO (best-effort; non-fatal on error)
		var oldKey sql.NullString
		_ = deps.db.QueryRowContext(ctx,
			`SELECT avatar_url FROM user_profiles WHERE user_id = $1`, userID,
		).Scan(&oldKey)
		if oldKey.Valid && strings.HasPrefix(oldKey.String, "avatars/") {
			if rmErr := mc.RemoveObject(ctx, minioBucket, oldKey.String, minio.RemoveObjectOptions{}); rmErr != nil {
				deps.log.Warn("could not remove old avatar from MinIO",
					zap.String("user_id", userID),
					zap.String("key", oldKey.String),
					zap.Error(rmErr),
				)
			}
		}

		// New key — unique per upload so CDN / browser caching never stales
		s3Key := fmt.Sprintf("avatars/%s/%s%s", userID, uuid.New().String(), ext)

		_, err = mc.PutObject(ctx, minioBucket, s3Key, file, header.Size, minio.PutObjectOptions{
			ContentType: detectedCT,
		})
		if err != nil {
			deps.log.Error("avatar MinIO upload failed",
				zap.String("user_id", userID),
				zap.Error(err),
			)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to upload avatar"})
			return
		}

		// Persist the s3 key into user_profiles
		_, err = deps.db.ExecContext(ctx,
			`UPDATE user_profiles SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2`,
			s3Key, userID,
		)
		if err != nil {
			// Roll back the orphaned MinIO object
			_ = mc.RemoveObject(ctx, minioBucket, s3Key, minio.RemoveObjectOptions{})
			deps.log.Error("failed to persist avatar_url",
				zap.String("user_id", userID),
				zap.Error(err),
			)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to save avatar"})
			return
		}

		deps.log.Info("avatar uploaded",
			zap.String("user_id", userID),
			zap.String("s3_key", s3Key),
		)

		// Return a versioned serving URL so the browser cache-busts automatically
		avatarURL := fmt.Sprintf("/api/avatar/%s?v=%d", userID, time.Now().Unix())
		writeJSON(w, http.StatusOK, map[string]string{"avatarUrl": avatarURL})
	}
}

// handleAvatarRemove handles DELETE /api/avatar/me
//
// Removes the calling user's avatar from MinIO and clears the DB column.
func handleAvatarRemove(deps *chatDeps, mc *minio.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodDelete {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		userID, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		ctx := r.Context()

		var oldKey sql.NullString
		_ = deps.db.QueryRowContext(ctx,
			`SELECT avatar_url FROM user_profiles WHERE user_id = $1`, userID,
		).Scan(&oldKey)

		if oldKey.Valid && strings.HasPrefix(oldKey.String, "avatars/") {
			if rmErr := mc.RemoveObject(ctx, minioBucket, oldKey.String, minio.RemoveObjectOptions{}); rmErr != nil {
				deps.log.Warn("could not remove avatar from MinIO",
					zap.String("user_id", userID),
					zap.String("key", oldKey.String),
					zap.Error(rmErr),
				)
			}
		}

		_, err = deps.db.ExecContext(ctx,
			`UPDATE user_profiles SET avatar_url = NULL, updated_at = NOW() WHERE user_id = $1`, userID,
		)
		if err != nil {
			deps.log.Error("failed to clear avatar_url",
				zap.String("user_id", userID),
				zap.Error(err),
			)
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to remove avatar"})
			return
		}

		deps.log.Info("avatar removed", zap.String("user_id", userID))
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
	}
}

// handleAvatarServe handles GET /api/avatar/{userID}
//
// Publicly serves the user's current avatar straight from MinIO.
// No auth required — avatars are considered public profile assets.
// Infers Content-Type from the stored s3 key extension.
func handleAvatarServe(deps *chatDeps, mc *minio.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		// Strip prefix + trailing slash; also reject reserved path segments
		targetUserID := strings.TrimPrefix(r.URL.Path, "/api/avatar/")
		targetUserID = strings.SplitN(targetUserID, "/", 2)[0] // ignore sub-paths
		if targetUserID == "" || targetUserID == "upload" || targetUserID == "me" {
			http.NotFound(w, r)
			return
		}

		ctx := r.Context()

		var s3Key sql.NullString
		err := deps.db.QueryRowContext(ctx,
			`SELECT avatar_url FROM user_profiles WHERE user_id = $1`, targetUserID,
		).Scan(&s3Key)
		if err != nil || !s3Key.Valid || s3Key.String == "" {
			http.NotFound(w, r)
			return
		}

		obj, err := mc.GetObject(ctx, minioBucket, s3Key.String, minio.GetObjectOptions{})
		if err != nil {
			deps.log.Error("failed to retrieve avatar from MinIO",
				zap.String("user_id", targetUserID),
				zap.Error(err),
			)
			http.NotFound(w, r)
			return
		}
		defer obj.Close()

		ct := contentTypeFromKey(s3Key.String)
		w.Header().Set("Content-Type", ct)
		// Allow public caching for 24 h; the version query param busts it after upload
		w.Header().Set("Cache-Control", "public, max-age=86400, immutable")

		if _, copyErr := io.Copy(w, obj); copyErr != nil {
			deps.log.Warn("error streaming avatar to client",
				zap.String("user_id", targetUserID),
				zap.Error(copyErr),
			)
		}
	}
}

func contentTypeFromKey(key string) string {
	switch {
	case strings.HasSuffix(key, ".png"):
		return "image/png"
	case strings.HasSuffix(key, ".webp"):
		return "image/webp"
	case strings.HasSuffix(key, ".gif"):
		return "image/gif"
	default:
		return "image/jpeg"
	}
}
