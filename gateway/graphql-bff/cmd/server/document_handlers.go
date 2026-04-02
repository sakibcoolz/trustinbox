package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/trustinbox/graphql-bff/internal/clients"
	commpb "github.com/trustinbox/proto/gen/communication/v1"
	"go.uber.org/zap"
)

// ─── Document types ───────────────────────────────────────

type documentClassification struct {
	ID           string  `json:"id"`
	Label        string  `json:"label"`
	Confidence   float64 `json:"confidence"`
	ClassifiedBy string  `json:"classifiedBy"`
}

type documentRow struct {
	ID                string                   `json:"id"`
	FileName          string                   `json:"fileName"`
	FileType          string                   `json:"fileType"`
	FileSize          int64                    `json:"fileSize"`
	S3Key             string                   `json:"s3Key"`
	Status            string                   `json:"status"`
	Classifications   []documentClassification `json:"classifications"`
	ShareCount        int                      `json:"shareCount"`
	UploadedBy        string                   `json:"uploadedBy"`
	UploadedByName    string                   `json:"uploadedByName"`
	ServiceProviderID string                   `json:"serviceProviderId"`
	CreatedAt         string                   `json:"createdAt"`
	UpdatedAt         string                   `json:"updatedAt"`
}

type documentConnection struct {
	Nodes      []documentRow `json:"nodes"`
	TotalCount int           `json:"totalCount"`
}

type documentShareRow struct {
	ID           string  `json:"id"`
	DocumentID   string  `json:"documentId"`
	RecipientID  string  `json:"recipientVirtualId"`
	ShareContext string  `json:"shareContext"`
	SignedURL    *string `json:"signedUrl"`
	ExpiresAt    *string `json:"expiresAt"`
	Message      *string `json:"message"`
	CreatedAt    string  `json:"createdAt"`
}

// ─── Main handler ─────────────────────────────────────────

func handleProviderDocumentsAll(svc *clients.ServiceClients, db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		if spID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing service provider context"})
			return
		}

		rest := strings.TrimPrefix(r.URL.Path, "/api/v1/documents")
		rest = strings.TrimPrefix(rest, "/")

		// Sub-routes: /api/v1/documents/presigned-url, /api/v1/documents/share
		if rest == "presigned-url" {
			handleDocPresignedURL(w, r, db, log, spID)
			return
		}
		if rest == "share" {
			handleDocShare(w, r, svc, log, spID)
			return
		}

		// Sub-routes for individual documents: /api/v1/documents/{id}[/sub]
		if rest != "" {
			parts := strings.SplitN(rest, "/", 2)
			docID := parts[0]
			sub := ""
			if len(parts) > 1 {
				sub = parts[1]
			}
			handleDocumentSubRoute(w, r, db, log, spID, docID, sub)
			return
		}

		// ── Collection routes ──────────────────────────────────
		switch r.Method {
		case http.MethodGet:
			handleListDocuments(w, r, db, log, spID)
		case http.MethodPost:
			handleCreateDocument(w, r, db, log, spID)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── List documents ───────────────────────────────────────

func handleListDocuments(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	limit := queryInt(r, "limit", 25)
	offset := queryInt(r, "offset", 0)
	if limit > 100 {
		limit = 100
	}

	search := r.URL.Query().Get("search")
	classification := r.URL.Query().Get("classification")
	statusFilter := r.URL.Query().Get("status")

	// Build WHERE clauses
	where := "WHERE d.service_provider_id = $1"
	args := []interface{}{spID}
	argN := 2

	if search != "" {
		where += " AND d.file_name ILIKE $" + itoa(argN)
		args = append(args, "%"+search+"%")
		argN++
	}
	if classification != "" {
		// No classification column in DB yet — filter is a no-op
		_ = classification
	}
	if statusFilter != "" {
		// No status column in DB yet — filter is a no-op
		_ = statusFilter
	}

	// Count
	var total int
	countQ := "SELECT COUNT(*) FROM documents d " + where
	if err := db.QueryRowContext(r.Context(), countQ, args...).Scan(&total); err != nil {
		log.Error("count documents", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	// Fetch
	q := `SELECT d.id, d.file_name, d.file_type, COALESCE(d.file_size, 0),
	             d.s3_key, d.service_provider_id,
	             COALESCE(d.uploaded_by_sp_user_id::text, ''),
	             COALESCE(up.full_name, ''),
	             d.created_at,
	             (SELECT COUNT(*) FROM document_shares ds WHERE ds.document_id = d.id)
	      FROM documents d
	      LEFT JOIN service_provider_users spu ON spu.id = d.uploaded_by_sp_user_id
	      LEFT JOIN user_profiles up ON up.user_id = spu.user_id
	      ` + where + `
	      ORDER BY d.created_at DESC
	      LIMIT $` + itoa(argN) + ` OFFSET $` + itoa(argN+1)
	args = append(args, limit, offset)

	rows, err := db.QueryContext(r.Context(), q, args...)
	if err != nil {
		log.Error("list documents", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	nodes := make([]documentRow, 0)
	for rows.Next() {
		var d documentRow
		var createdAt string
		if err := rows.Scan(
			&d.ID, &d.FileName, &d.FileType, &d.FileSize,
			&d.S3Key, &d.ServiceProviderID,
			&d.UploadedBy, &d.UploadedByName,
			&createdAt, &d.ShareCount,
		); err != nil {
			log.Error("scan document row", zap.Error(err))
			continue
		}
		d.CreatedAt = createdAt
		d.UpdatedAt = createdAt // no updated_at column yet
		d.Status = "ACTIVE"     // no status column yet
		d.Classifications = []documentClassification{}
		nodes = append(nodes, d)
	}

	writeJSON(w, http.StatusOK, documentConnection{
		Nodes:      nodes,
		TotalCount: total,
	})
}

// ─── Create document ──────────────────────────────────────

func handleCreateDocument(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	var body struct {
		FileName       string `json:"fileName"`
		FileType       string `json:"fileType"`
		S3Key          string `json:"s3Key"`
		FileSize       int64  `json:"fileSize"`
		Classification string `json:"classification"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}
	if body.FileName == "" || body.S3Key == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "fileName and s3Key are required"})
		return
	}

	var d documentRow
	err := db.QueryRowContext(r.Context(),
		`INSERT INTO documents (service_provider_id, file_name, file_type, s3_key, file_size)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, file_name, file_type, COALESCE(file_size, 0), s3_key,
		           service_provider_id, created_at`,
		spID, body.FileName, body.FileType, body.S3Key, body.FileSize,
	).Scan(&d.ID, &d.FileName, &d.FileType, &d.FileSize, &d.S3Key,
		&d.ServiceProviderID, &d.CreatedAt)
	if err != nil {
		log.Error("create document", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	d.UpdatedAt = d.CreatedAt
	d.Status = "ACTIVE"
	d.Classifications = []documentClassification{}

	writeJSON(w, http.StatusCreated, d)
}

// ─── Document sub-routes ──────────────────────────────────

func handleDocumentSubRoute(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, docID, sub string) {
	switch sub {
	case "":
		// GET /api/v1/documents/{id}  or  DELETE /api/v1/documents/{id}
		switch r.Method {
		case http.MethodGet:
			handleGetDocument(w, r, db, log, spID, docID)
		case http.MethodDelete:
			handleDeleteDocument(w, r, db, log, spID, docID)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	case "versions":
		handleDocVersions(w, r, db, log, spID, docID)
	case "shares":
		handleDocShares(w, r, db, log, spID, docID)
	case "archive":
		handleDocArchive(w, r, db, log, spID, docID)
	case "classification":
		handleDocClassification(w, r, db, log, spID, docID)
	case "signed-url":
		handleDocSignedURL(w, r, db, log, spID, docID)
	default:
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "not found"})
	}
}

// ─── Get single document ──────────────────────────────────

func handleGetDocument(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, docID string) {
	var d documentRow
	err := db.QueryRowContext(r.Context(),
		`SELECT d.id, d.file_name, d.file_type, COALESCE(d.file_size, 0),
		        d.s3_key, d.service_provider_id,
		        COALESCE(d.uploaded_by_sp_user_id::text, ''),
		        COALESCE(up.full_name, ''),
		        d.created_at,
		        (SELECT COUNT(*) FROM document_shares ds WHERE ds.document_id = d.id)
		 FROM documents d
		 LEFT JOIN service_provider_users spu ON spu.id = d.uploaded_by_sp_user_id
		 LEFT JOIN user_profiles up ON up.user_id = spu.user_id
		 WHERE d.id = $1 AND d.service_provider_id = $2`,
		docID, spID,
	).Scan(
		&d.ID, &d.FileName, &d.FileType, &d.FileSize,
		&d.S3Key, &d.ServiceProviderID,
		&d.UploadedBy, &d.UploadedByName,
		&d.CreatedAt, &d.ShareCount,
	)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "document not found"})
		return
	}
	if err != nil {
		log.Error("get document", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	d.UpdatedAt = d.CreatedAt
	d.Status = "ACTIVE"
	d.Classifications = []documentClassification{}

	writeJSON(w, http.StatusOK, d)
}

// ─── Delete document ──────────────────────────────────────

func handleDeleteDocument(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, docID string) {
	res, err := db.ExecContext(r.Context(),
		`DELETE FROM documents WHERE id = $1 AND service_provider_id = $2`,
		docID, spID,
	)
	if err != nil {
		log.Error("delete document", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "document not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ─── Document versions ────────────────────────────────────

func handleDocVersions(w http.ResponseWriter, _ *http.Request, _ *sql.DB, _ *zap.Logger, _, _ string) {
	// No document_versions table yet — return empty
	writeJSON(w, http.StatusOK, []interface{}{})
}

// ─── Document shares ──────────────────────────────────────

func handleDocShares(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, docID string) {
	rows, err := db.QueryContext(r.Context(),
		`SELECT ds.id, ds.document_id, ds.user_id, ds.share_context, ds.created_at
		 FROM document_shares ds
		 WHERE ds.document_id = $1 AND ds.service_provider_id = $2
		 ORDER BY ds.created_at DESC`,
		docID, spID,
	)
	if err != nil {
		log.Error("list document shares", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	shares := make([]documentShareRow, 0)
	for rows.Next() {
		var s documentShareRow
		if err := rows.Scan(&s.ID, &s.DocumentID, &s.RecipientID, &s.ShareContext, &s.CreatedAt); err != nil {
			log.Error("scan document share", zap.Error(err))
			continue
		}
		shares = append(shares, s)
	}
	writeJSON(w, http.StatusOK, shares)
}

// ─── Archive document ─────────────────────────────────────

func handleDocArchive(w http.ResponseWriter, _ *http.Request, _ *sql.DB, _ *zap.Logger, _, _ string) {
	// No status column yet
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ─── Update classification ────────────────────────────────

func handleDocClassification(w http.ResponseWriter, _ *http.Request, _ *sql.DB, _ *zap.Logger, _, _ string) {
	// No classification table yet
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ─── Signed URL for existing document ─────────────────────

func handleDocSignedURL(w http.ResponseWriter, _ *http.Request, _ *sql.DB, _ *zap.Logger, _, _ string) {
	// TODO: integrate with MinIO presigned URL generation
	writeJSON(w, http.StatusNotImplemented, errorResponse{Error: "signed URL generation not yet implemented on this route"})
}

// ─── Presigned URL for upload ─────────────────────────────

func handleDocPresignedURL(w http.ResponseWriter, _ *http.Request, _ *sql.DB, _ *zap.Logger, _ string) {
	// TODO: integrate with MinIO presigned URL generation
	writeJSON(w, http.StatusNotImplemented, errorResponse{Error: "presigned URL generation not yet implemented on this route"})
}

// ─── Share document (gRPC) ────────────────────────────────

func handleDocShare(w http.ResponseWriter, r *http.Request, svc *clients.ServiceClients, log *zap.Logger, spID string) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	var body struct {
		UserID       string `json:"userId"`
		DocumentID   string `json:"documentId"`
		ShareContext string `json:"shareContext"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}
	resp, err := svc.Communication.ShareDocument(r.Context(), &commpb.ShareDocumentRequest{
		DocumentId:        body.DocumentID,
		UserId:            body.UserID,
		ServiceProviderId: spID,
		ShareContext:      body.ShareContext,
	})
	if err != nil {
		grpcErrToHTTP(w, err, log)
		return
	}
	writeJSON(w, http.StatusCreated, resp)
}

// ─── Helpers ──────────────────────────────────────────────

func itoa(n int) string {
	return strconv.Itoa(n)
}
