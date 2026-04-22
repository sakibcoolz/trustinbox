package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
)

// handleProviderBotWorkflows manages /api/v1/bots/{botId}/workflows
//
// Routes:
//
//	GET    /api/v1/bots/{botId}/workflows                     — list configs
//	POST   /api/v1/bots/{botId}/workflows                     — create config
//	GET    /api/v1/bots/{botId}/workflows/{configId}          — get config
//	PUT    /api/v1/bots/{botId}/workflows/{configId}          — update config
//	DELETE /api/v1/bots/{botId}/workflows/{configId}          — delete config
func handleProviderBotWorkflows(
	w http.ResponseWriter,
	r *http.Request,
	db *sql.DB,
	log *zap.Logger,
	spID, botID string,
) {
	// Verify bot belongs to SP
	var ownerSP string
	if err := db.QueryRowContext(r.Context(),
		`SELECT service_provider_id FROM bots WHERE id = $1`, botID,
	).Scan(&ownerSP); err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "bot not found"})
		return
	} else if err != nil {
		log.Error("verify bot owner", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	if ownerSP != spID {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "bot does not belong to this service provider"})
		return
	}

	// Path: /api/v1/bots/{botId}/workflows[/{configId}]
	prefix := "/api/v1/bots/" + botID + "/workflows"
	rest := strings.TrimPrefix(r.URL.Path, prefix)
	rest = strings.TrimPrefix(rest, "/")

	if rest == "" {
		switch r.Method {
		case http.MethodGet:
			listWorkflowConfigs(w, r, db, log, botID)
		case http.MethodPost:
			createWorkflowConfig(w, r, db, log, botID)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
		return
	}

	configID := strings.SplitN(rest, "/", 2)[0]
	switch r.Method {
	case http.MethodGet:
		getWorkflowConfig(w, r, db, log, botID, configID)
	case http.MethodPut:
		updateWorkflowConfig(w, r, db, log, botID, configID)
	case http.MethodDelete:
		deleteWorkflowConfig(w, r, db, log, botID, configID)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

// ─── DB-backed CRUD helpers ──────────────────────────────────────────────────

func listWorkflowConfigs(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, botID string) {
	rows, err := db.QueryContext(r.Context(),
		`SELECT id, bot_id, workflow_id, workflow_name, webhook_path, description, is_active, created_at, updated_at
		 FROM bot_workflow_configs WHERE bot_id = $1 ORDER BY created_at DESC`, botID)
	if err != nil {
		log.Error("list workflow configs", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	out := []map[string]interface{}{}
	for rows.Next() {
		m, err := scanWorkflowConfig(rows)
		if err != nil {
			log.Error("scan workflow config", zap.Error(err))
			continue
		}
		out = append(out, m)
	}
	writeJSON(w, http.StatusOK, out)
}

func createWorkflowConfig(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, botID string) {
	var body struct {
		WorkflowID   string `json:"workflowId"`
		WorkflowName string `json:"workflowName"`
		WebhookPath  string `json:"webhookPath"`
		Description  string `json:"description"`
		IsActive     bool   `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}
	if body.WorkflowID == "" || body.WorkflowName == "" || body.WebhookPath == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "workflowId, workflowName, webhookPath are required"})
		return
	}
	if !strings.HasPrefix(body.WebhookPath, "/") {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "webhookPath must start with '/'"})
		return
	}

	var id string
	err := db.QueryRowContext(r.Context(),
		`INSERT INTO bot_workflow_configs
		 (bot_id, workflow_id, workflow_name, webhook_path, description, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id`,
		botID, body.WorkflowID, body.WorkflowName, body.WebhookPath, body.Description, body.IsActive,
	).Scan(&id)
	if err != nil {
		log.Error("create workflow config", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error (workflow_id may already exist)"})
		return
	}
	getWorkflowConfig(w, r, db, log, botID, id)
}

func getWorkflowConfig(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, botID, configID string) {
	row := db.QueryRowContext(r.Context(),
		`SELECT id, bot_id, workflow_id, workflow_name, webhook_path, description, is_active, created_at, updated_at
		 FROM bot_workflow_configs WHERE id = $1 AND bot_id = $2`, configID, botID)

	var (
		id, bID, wfID, wfName, webhookPath, description string
		isActive                                        bool
		createdAt, updatedAt                            time.Time
	)
	err := row.Scan(&id, &bID, &wfID, &wfName, &webhookPath, &description, &isActive, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "workflow config not found"})
		return
	}
	if err != nil {
		log.Error("get workflow config", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":           id,
		"botId":        bID,
		"workflowId":   wfID,
		"workflowName": wfName,
		"webhookPath":  webhookPath,
		"description":  description,
		"isActive":     isActive,
		"createdAt":    createdAt,
		"updatedAt":    updatedAt,
	})
}

func updateWorkflowConfig(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, botID, configID string) {
	var body struct {
		WorkflowName string `json:"workflowName"`
		WebhookPath  string `json:"webhookPath"`
		Description  string `json:"description"`
		IsActive     bool   `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}
	if body.WebhookPath != "" && !strings.HasPrefix(body.WebhookPath, "/") {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "webhookPath must start with '/'"})
		return
	}

	res, err := db.ExecContext(r.Context(),
		`UPDATE bot_workflow_configs
		 SET workflow_name = COALESCE(NULLIF($1, ''), workflow_name),
		     webhook_path  = COALESCE(NULLIF($2, ''), webhook_path),
		     description   = $3,
		     is_active     = $4,
		     updated_at    = NOW()
		 WHERE id = $5 AND bot_id = $6`,
		body.WorkflowName, body.WebhookPath, body.Description, body.IsActive, configID, botID,
	)
	if err != nil {
		log.Error("update workflow config", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "workflow config not found"})
		return
	}
	getWorkflowConfig(w, r, db, log, botID, configID)
}

func deleteWorkflowConfig(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, botID, configID string) {
	res, err := db.ExecContext(r.Context(),
		`DELETE FROM bot_workflow_configs WHERE id = $1 AND bot_id = $2`, configID, botID)
	if err != nil {
		log.Error("delete workflow config", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "workflow config not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func scanWorkflowConfig(rows *sql.Rows) (map[string]interface{}, error) {
	var (
		id, botID, wfID, wfName, webhookPath, description string
		isActive                                          bool
		createdAt, updatedAt                              time.Time
	)
	if err := rows.Scan(&id, &botID, &wfID, &wfName, &webhookPath, &description, &isActive, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id":           id,
		"botId":        botID,
		"workflowId":   wfID,
		"workflowName": wfName,
		"webhookPath":  webhookPath,
		"description":  description,
		"isActive":     isActive,
		"createdAt":    createdAt,
		"updatedAt":    updatedAt,
	}, nil
}

// ─── n8n async resume callback ───────────────────────────────────────────────

// handleWorkflowResume receives async results from n8n workflows and marks the
// suspension as resumed. It is mounted at /api/v1/workflows/resume/{token}
// OUTSIDE the API-key middleware because n8n authenticates via HMAC-SHA256.
//
// POST body: arbitrary JSON (passed through as the workflow result).
//
// Required headers:
//
//	X-TrustInbox-Timestamp  — Unix seconds (must be within ±5 minutes)
//	X-TrustInbox-Signature  — hex(HMAC-SHA256(secret, "timestamp.body"))
func handleWorkflowResume(db *sql.DB, log *zap.Logger) http.HandlerFunc {
	secret := getEnvOrDefault("N8N_WEBHOOK_SECRET", "")

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		token := strings.TrimPrefix(r.URL.Path, "/api/v1/workflows/resume/")
		if token == "" || strings.ContainsAny(token, "/?#") {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid resume token"})
			return
		}

		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20)) // max 1 MB
		if err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "failed to read body"})
			return
		}

		// HMAC verification
		if !verifyResumeSignature(r, body, secret) {
			log.Warn("workflow resume signature verification failed", zap.String("token_prefix", safePrefix(token, 8)))
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid signature"})
			return
		}

		// Look up suspension and mark resumed atomically.
		now := time.Now().UTC()
		var (
			botID, conversationID, userID, workflowID, status string
			expiresAt                                         time.Time
		)
		err = db.QueryRowContext(r.Context(),
			`SELECT bot_id, conversation_id, user_id, workflow_id, status, expires_at
			 FROM bot_workflow_suspensions WHERE resume_token = $1`, token,
		).Scan(&botID, &conversationID, &userID, &workflowID, &status, &expiresAt)
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "unknown resume token"})
			return
		}
		if err != nil {
			log.Error("lookup suspension", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
			return
		}
		if status != "PENDING" {
			writeJSON(w, http.StatusConflict, errorResponse{Error: "workflow already resumed"})
			return
		}
		if now.After(expiresAt) {
			writeJSON(w, http.StatusGone, errorResponse{Error: "resume token expired"})
			return
		}

		_, err = db.ExecContext(r.Context(),
			`UPDATE bot_workflow_suspensions
			 SET status = 'RESUMED', result_json = $1, resumed_at = $2
			 WHERE resume_token = $3 AND status = 'PENDING'`,
			string(body), now, token,
		)
		if err != nil {
			log.Error("mark suspension resumed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
			return
		}

		log.Info("workflow resumed",
			zap.String("bot_id", botID),
			zap.String("workflow_id", workflowID),
			zap.String("user_id", userID),
		)

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"ok":             true,
			"botId":          botID,
			"conversationId": conversationID,
			"userId":         userID,
			"workflowId":     workflowID,
		})
	}
}

// verifyResumeSignature checks the HMAC-SHA256 signature on a resume request.
// Returns false if the signature is missing, malformed, expired, or invalid.
// When secret is empty, signature verification is skipped (development mode).
func verifyResumeSignature(r *http.Request, body []byte, secret string) bool {
	if secret == "" {
		// Development/testing fallback.
		return true
	}
	tsStr := r.Header.Get("X-TrustInbox-Timestamp")
	sig := r.Header.Get("X-TrustInbox-Signature")
	if tsStr == "" || sig == "" {
		return false
	}
	ts, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil {
		return false
	}
	// Reject timestamps drifting more than 5 minutes (replay-attack window).
	if abs(time.Now().Unix()-ts) > 300 {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(tsStr))
	mac.Write([]byte("."))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(expected), []byte(sig))
}

func abs(n int64) int64 {
	if n < 0 {
		return -n
	}
	return n
}

func safePrefix(s string, n int) string {
	if len(s) < n {
		return s
	}
	return s[:n]
}
