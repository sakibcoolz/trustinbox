package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

const (
	minioBucket   = "trustinbox-chat"
	maxUploadSize = 50 * 1024 * 1024 // 50MB
)

func initMinioClient(log *zap.Logger) *minio.Client {
	endpoint := getEnvOrDefault("MINIO_ENDPOINT", "localhost:9000")
	accessKey := getEnvOrDefault("MINIO_ACCESS_KEY", "trustinbox")
	secretKey := getEnvOrDefault("MINIO_SECRET_KEY", "trustinbox_dev")

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false,
	})
	if err != nil {
		log.Fatal("failed to create MinIO client", zap.Error(err))
	}

	// Ensure bucket exists
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for _, b := range []string{minioBucket, getEnvOrDefault("MINIO_BUCKET", "trustinbox")} {
		exists, err := client.BucketExists(ctx, b)
		if err != nil {
			log.Error("failed to check MinIO bucket", zap.Error(err), zap.String("bucket", b))
			continue
		}
		if !exists {
			if err := client.MakeBucket(ctx, b, minio.MakeBucketOptions{}); err != nil {
				log.Error("failed to create MinIO bucket", zap.Error(err), zap.String("bucket", b))
			} else {
				log.Info("created MinIO bucket", zap.String("bucket", b))
			}
		}
	}

	log.Info("connected to MinIO", zap.String("endpoint", endpoint))
	return client
}

func getEnvOrDefault(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

// handleUploadFile handles POST /api/upload
// Returns attachment metadata (pre-linked to be attached to a message later)
func handleUploadFile(deps *chatDeps, minioClient *minio.Client) http.HandlerFunc {
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

		// Limit request body size
		r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

		if err := r.ParseMultipartForm(maxUploadSize); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "file too large (max 50MB)"})
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "file is required"})
			return
		}
		defer file.Close()

		// Validate file type (allow common types)
		ext := strings.ToLower(filepath.Ext(header.Filename))
		contentType := header.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		// Sanitize filename
		safeName := sanitizeFilename(header.Filename)

		// Generate S3 key
		attachmentID := uuid.New().String()
		s3Key := fmt.Sprintf("chat/%s/%s/%s%s", userID, time.Now().Format("2006/01/02"), attachmentID, ext)

		ctx := r.Context()

		// Upload to MinIO
		_, err = minioClient.PutObject(ctx, minioBucket, s3Key, file, header.Size, minio.PutObjectOptions{
			ContentType: contentType,
		})
		if err != nil {
			deps.log.Error("failed to upload to MinIO", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to upload file"})
			return
		}

		// Insert attachment record (message_id will be set when message is sent)
		_, err = deps.db.ExecContext(ctx,
			`INSERT INTO message_attachments (id, file_name, file_type, file_size, s3_key)
			 VALUES ($1, $2, $3, $4, $5)`,
			attachmentID, safeName, contentType, header.Size, s3Key,
		)
		if err != nil {
			deps.log.Error("failed to insert attachment record", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to save attachment"})
			return
		}

		deps.log.Info("file uploaded",
			zap.String("user_id", userID),
			zap.String("attachment_id", attachmentID),
			zap.String("file_name", safeName),
			zap.Int64("file_size", header.Size),
		)

		writeJSON(w, http.StatusCreated, attachmentResponse{
			ID:       attachmentID,
			FileName: safeName,
			FileType: contentType,
			FileSize: header.Size,
			URL:      fmt.Sprintf("/api/files/%s", attachmentID),
		})
	}
}

// handleServeFile handles GET /api/files/{id}
func handleServeFile(deps *chatDeps, minioClient *minio.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		_, err := extractUserID(r, deps.tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		fileID := extractPathParam(r.URL.Path, "/api/files/", "")
		if fileID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "file id required"})
			return
		}

		// Remove /thumb suffix if present
		isThumb := strings.HasSuffix(fileID, "/thumb")
		fileID = strings.TrimSuffix(fileID, "/thumb")

		ctx := r.Context()

		var fileName, fileType, s3Key string
		var thumbKey *string
		err = deps.db.QueryRowContext(ctx,
			`SELECT file_name, file_type, s3_key, thumbnail_s3_key FROM message_attachments WHERE id = $1`,
			fileID,
		).Scan(&fileName, &fileType, &s3Key, &thumbKey)
		if err != nil {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "file not found"})
			return
		}

		key := s3Key
		if isThumb && thumbKey != nil {
			key = *thumbKey
		}

		obj, err := minioClient.GetObject(ctx, minioBucket, key, minio.GetObjectOptions{})
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to retrieve file"})
			return
		}
		defer obj.Close()

		w.Header().Set("Content-Type", fileType)
		w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, fileName))
		w.Header().Set("Cache-Control", "private, max-age=3600")

		io.Copy(w, obj)
	}
}

func sanitizeFilename(name string) string {
	// Remove path components
	name = filepath.Base(name)
	// Remove special characters
	safe := strings.Map(func(r rune) rune {
		if r == '/' || r == '\\' || r == '\x00' {
			return '_'
		}
		return r
	}, name)
	if len(safe) > 255 {
		safe = safe[:255]
	}
	if safe == "" {
		safe = "unnamed"
	}
	return safe
}
