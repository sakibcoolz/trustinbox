package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"go.uber.org/zap"
)

// ─── Customer Types ───────────────────────────────────────

type customerRow struct {
	VirtualID        string `json:"virtualId"`
	DisplayName      string `json:"displayName"`
	Category         string `json:"category"`
	LastContactAt    string `json:"lastContactAt"`
	Status           string `json:"status"`
	InteractionCount int    `json:"interactionCount"`
}

type customerConnection struct {
	Nodes      []customerRow  `json:"nodes"`
	TotalCount int            `json:"totalCount"`
	PageInfo   pageInfoResult `json:"pageInfo"`
}

type pageInfoResult struct {
	HasNextPage     bool   `json:"hasNextPage"`
	HasPreviousPage bool   `json:"hasPreviousPage"`
	StartCursor     string `json:"startCursor"`
	EndCursor       string `json:"endCursor"`
}

type addCustomerRequest struct {
	VirtualID        string `json:"virtualId"`
	RelationshipType string `json:"relationshipType"`
}

type removeCustomerRequest struct {
	VirtualID string `json:"virtualId"`
}

type customerNoteRow struct {
	ID         string `json:"id"`
	Content    string `json:"content"`
	AuthorName string `json:"authorName"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt,omitempty"`
}

type customerTagRow struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Color string `json:"color,omitempty"`
}

// ─── Customer List + Add/Remove ───────────────────────────

func handleProviderCustomers(db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		if spID == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "missing service provider context"})
			return
		}

		// Route: /api/v1/customers or /api/v1/customers/{virtualId}[/sub]
		rest := strings.TrimPrefix(r.URL.Path, "/api/v1/customers")
		rest = strings.TrimPrefix(rest, "/")

		if rest != "" {
			parts := strings.SplitN(rest, "/", 2)
			virtualID := parts[0]
			sub := ""
			if len(parts) > 1 {
				sub = parts[1]
			}
			handleCustomerSubRoute(w, r, db, log, spID, virtualID, sub)
			return
		}

		switch r.Method {
		case http.MethodGet:
			handleCustomerList(w, r, db, log, spID)
		case http.MethodPost:
			handleCustomerAdd(w, r, db, log, spID)
		case http.MethodDelete:
			handleCustomerRemove(w, r, db, log, spID)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── List ─────────────────────────────────────────────────

func handleCustomerList(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	first := 25
	if v := r.URL.Query().Get("first"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			first = n
		}
	}
	offset := 0
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	orderBy := "last_contact_at"
	switch r.URL.Query().Get("orderByField") {
	case "displayName":
		orderBy = "display_name"
	case "lastContactAt":
		orderBy = "last_contact_at"
	case "interactionCount":
		orderBy = "interaction_count"
	case "status":
		orderBy = "csr.status"
	case "virtualId":
		orderBy = "virtual_id"
	}
	orderDir := "DESC"
	if strings.EqualFold(r.URL.Query().Get("orderByDirection"), "ASC") {
		orderDir = "ASC"
	}

	search := r.URL.Query().Get("search")
	statusFilter := r.URL.Query().Get("status")
	categoryFilter := r.URL.Query().Get("category")

	// Base query parts — join user_identities for virtual public ID
	baseFrom := `FROM customer_sp_relations csr
		JOIN users u ON u.id = csr.user_id
		LEFT JOIN user_profiles up ON up.user_id = u.id
		LEFT JOIN user_identities ui ON ui.user_id = u.id AND ui.is_active = TRUE
		WHERE csr.service_provider_id = $1`

	countArgs := []interface{}{spID}
	argN := 2

	filterSQL := ""
	if search != "" {
		filterSQL += ` AND (COALESCE(up.full_name, u.username) ILIKE $` + strconv.Itoa(argN) +
			` OR ui.virtual_public_id ILIKE $` + strconv.Itoa(argN) + `)`
		countArgs = append(countArgs, "%"+search+"%")
		argN++
	}
	if statusFilter != "" {
		filterSQL += ` AND csr.status = $` + strconv.Itoa(argN)
		countArgs = append(countArgs, statusFilter)
		argN++
	}
	if categoryFilter != "" {
		filterSQL += ` AND csr.relationship_type = $` + strconv.Itoa(argN)
		countArgs = append(countArgs, categoryFilter)
		argN++
	}

	// Count
	var totalCount int
	countQuery := `SELECT COUNT(*) ` + baseFrom + filterSQL
	if err := db.QueryRowContext(r.Context(), countQuery, countArgs...).Scan(&totalCount); err != nil {
		log.Error("customer count query failed", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
		return
	}

	// Fetch rows
	selectCols := `SELECT
		COALESCE(ui.virtual_public_id, LEFT(u.id::text, 12)) AS virtual_id,
		COALESCE(up.full_name, u.username) AS display_name,
		csr.relationship_type,
		COALESCE(csr.last_contact_at, csr.created_at)::text AS last_contact_at,
		csr.status,
		(csr.total_notifications_sent + csr.total_callbacks + csr.total_conversations) AS interaction_count `
	args := make([]interface{}, len(countArgs))
	copy(args, countArgs)
	argIdx := argN

	query := selectCols + baseFrom + filterSQL +
		` ORDER BY ` + orderBy + ` ` + orderDir +
		` LIMIT $` + strconv.Itoa(argIdx) + ` OFFSET $` + strconv.Itoa(argIdx+1)
	args = append(args, first, offset)

	rows, err := db.QueryContext(r.Context(), query, args...)
	if err != nil {
		log.Error("customer list query failed", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
		return
	}
	defer rows.Close()

	nodes := make([]customerRow, 0)
	for rows.Next() {
		var c customerRow
		if err := rows.Scan(&c.VirtualID, &c.DisplayName, &c.Category, &c.LastContactAt, &c.Status, &c.InteractionCount); err != nil {
			log.Error("customer row scan failed", zap.Error(err))
			continue
		}
		nodes = append(nodes, c)
	}

	hasNext := offset+first < totalCount
	hasPrev := offset > 0
	startCursor := ""
	endCursor := ""
	if len(nodes) > 0 {
		startCursor = nodes[0].VirtualID
		endCursor = nodes[len(nodes)-1].VirtualID
	}

	writeJSON(w, http.StatusOK, customerConnection{
		Nodes:      nodes,
		TotalCount: totalCount,
		PageInfo: pageInfoResult{
			HasNextPage:     hasNext,
			HasPreviousPage: hasPrev,
			StartCursor:     startCursor,
			EndCursor:       endCursor,
		},
	})
}

// ─── Add Customer ─────────────────────────────────────────

func handleCustomerAdd(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	var req addCustomerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}
	if req.VirtualID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "virtualId is required"})
		return
	}

	// Resolve virtual ID → user ID
	var userID string
	err := db.QueryRowContext(r.Context(),
		`SELECT user_id FROM user_identities WHERE virtual_public_id = $1 AND is_active = TRUE`,
		req.VirtualID,
	).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "user with this virtual ID not found"})
		} else {
			log.Error("resolve virtual ID failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
		}
		return
	}

	relType := req.RelationshipType
	if relType == "" {
		relType = "CUSTOMER"
	}

	var id string
	err = db.QueryRowContext(r.Context(), `
		INSERT INTO customer_sp_relations (user_id, service_provider_id, relationship_type, status, first_contact_at, last_contact_at)
		VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
		ON CONFLICT (user_id, service_provider_id) DO UPDATE SET status = 'ACTIVE', updated_at = NOW()
		RETURNING id
	`, userID, spID, relType).Scan(&id)
	if err != nil {
		log.Error("add customer failed", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to add customer"})
		return
	}

	log.Info("customer added", zap.String("sp_id", spID), zap.String("virtual_id", req.VirtualID), zap.String("user_id", userID))
	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "virtualId": req.VirtualID, "status": "ACTIVE"})
}

// ─── Remove Customer ──────────────────────────────────────

func handleCustomerRemove(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	var req removeCustomerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
		return
	}
	if req.VirtualID == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "virtualId is required"})
		return
	}

	// Resolve virtual ID → user ID
	var userID string
	err := db.QueryRowContext(r.Context(),
		`SELECT user_id FROM user_identities WHERE virtual_public_id = $1 AND is_active = TRUE`,
		req.VirtualID,
	).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "user with this virtual ID not found"})
		} else {
			log.Error("resolve virtual ID failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
		}
		return
	}

	result, err := db.ExecContext(r.Context(), `
		DELETE FROM customer_sp_relations WHERE user_id = $1 AND service_provider_id = $2
	`, userID, spID)
	if err != nil {
		log.Error("remove customer failed", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to remove customer"})
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "customer relationship not found"})
		return
	}

	log.Info("customer removed", zap.String("sp_id", spID), zap.String("virtual_id", req.VirtualID))
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// ─── Customer Sub-routes ──────────────────────────────────

func handleCustomerSubRoute(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, virtualID, sub string) {
	// Resolve virtual ID → user UUID for sub-routes
	userID, err := resolveCustomerUserID(r, db, virtualID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "customer not found"})
		return
	}

	if r.Method == http.MethodGet && sub == "" {
		handleCustomerDetail(w, r, db, log, spID, userID, virtualID)
		return
	}
	if r.Method == http.MethodDelete && sub == "" {
		// DELETE /api/v1/customers/:virtualId — remove this customer
		result, err := db.ExecContext(r.Context(),
			`DELETE FROM customer_sp_relations WHERE user_id = $1 AND service_provider_id = $2`, userID, spID)
		if err != nil {
			log.Error("remove customer failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to remove customer"})
			return
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "customer relationship not found"})
			return
		}
		log.Info("customer removed", zap.String("sp_id", spID), zap.String("virtual_id", virtualID))
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})
		return
	}

	switch sub {
	case "timeline":
		handleCustomerTimeline(w, r, db, log, spID, userID)
	case "notes":
		handleCustomerNotes(w, r, db, log, spID, userID)
	case "tags":
		handleCustomerTags(w, r, db, log, spID, userID)
	default:
		if strings.HasPrefix(sub, "notes/") {
			noteID := strings.TrimPrefix(sub, "notes/")
			handleCustomerNoteMutation(w, r, db, log, spID, userID, noteID)
		} else if strings.HasPrefix(sub, "tags/") {
			tagID := strings.TrimPrefix(sub, "tags/")
			handleCustomerTagMutation(w, r, db, log, spID, tagID)
		} else {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "not found"})
		}
	}
}

func resolveCustomerUserID(r *http.Request, db *sql.DB, virtualID string) (string, error) {
	// If it looks like a UUID, use directly; otherwise resolve from user_identities
	if isUUID(virtualID) {
		return virtualID, nil
	}
	var userID string
	err := db.QueryRowContext(r.Context(),
		`SELECT user_id FROM user_identities WHERE virtual_public_id = $1 AND is_active = TRUE`, virtualID,
	).Scan(&userID)
	return userID, err
}

// ─── Detail ───────────────────────────────────────────────

func handleCustomerDetail(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, userID, virtualID string) {
	var displayName, relType, status, lastContact string
	var totalNotifs, totalCallbacks, totalConversations int

	err := db.QueryRowContext(r.Context(), `
		SELECT COALESCE(up.full_name, u.username),
		       csr.relationship_type, csr.status,
		       COALESCE(csr.last_contact_at, csr.created_at)::text,
		       csr.total_notifications_sent, csr.total_callbacks, csr.total_conversations
		FROM customer_sp_relations csr
		JOIN users u ON u.id = csr.user_id
		LEFT JOIN user_profiles up ON up.user_id = u.id
		WHERE u.id = $1 AND csr.service_provider_id = $2
	`, userID, spID).Scan(&displayName, &relType, &status, &lastContact,
		&totalNotifs, &totalCallbacks, &totalConversations)

	if err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "customer not found"})
		} else {
			log.Error("customer detail query failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"virtualId":     virtualID,
		"displayName":   displayName,
		"userType":      relType,
		"lastContactAt": lastContact,
		"privacyPreference": map[string]bool{
			"allowPersonalNotifications": true,
			"allowSPNotifications":       true,
			"allowAdvertisements":        false,
			"allowCallbackRequests":      true,
			"allowChat":                  true,
			"allowDocumentShares":        true,
			"requireCallApproval":        true,
		},
		"dndRules":          []interface{}{},
		"availabilitySlots": []interface{}{},
		"stats": map[string]int{
			"totalNotifications": totalNotifs,
			"deliveredCount":     totalNotifs,
			"failedCount":        0,
			"callbackCount":      totalCallbacks,
			"documentsShared":    0,
		},
		"notifications":    map[string]interface{}{"nodes": []interface{}{}, "totalCount": totalNotifs},
		"callbackRequests": map[string]interface{}{"nodes": []interface{}{}, "totalCount": totalCallbacks},
	})
}

// ─── Timeline ─────────────────────────────────────────────

func handleCustomerTimeline(w http.ResponseWriter, _ *http.Request, _ *sql.DB, _ *zap.Logger, _, _ string) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"nodes":      []interface{}{},
		"totalCount": 0,
	})
}

// ─── Notes CRUD ───────────────────────────────────────────

func handleCustomerNotes(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, userID string) {
	switch r.Method {
	case http.MethodGet:
		rows, err := db.QueryContext(r.Context(), `
			SELECT id, content, author_name, created_at::text, updated_at::text
			FROM customer_notes
			WHERE service_provider_id = $1 AND user_id = $2
			ORDER BY created_at DESC
		`, spID, userID)
		if err != nil {
			log.Error("list customer notes failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer rows.Close()

		notes := make([]customerNoteRow, 0)
		for rows.Next() {
			var n customerNoteRow
			if err := rows.Scan(&n.ID, &n.Content, &n.AuthorName, &n.CreatedAt, &n.UpdatedAt); err != nil {
				log.Error("scan customer note failed", zap.Error(err))
				continue
			}
			notes = append(notes, n)
		}
		writeJSON(w, http.StatusOK, notes)

	case http.MethodPost:
		var body struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Content) == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "content is required"})
			return
		}

		authorID := userIDFromRBACCtx(r.Context())
		authorName := "Agent"
		if authorID != "" {
			_ = db.QueryRowContext(r.Context(),
				`SELECT COALESCE(up.full_name, u.username) FROM users u LEFT JOIN user_profiles up ON up.user_id = u.id WHERE u.id = $1`,
				authorID,
			).Scan(&authorName)
		}

		var note customerNoteRow
		err := db.QueryRowContext(r.Context(), `
			INSERT INTO customer_notes (service_provider_id, user_id, content, author_user_id, author_name)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, content, author_name, created_at::text, updated_at::text
		`, spID, userID, strings.TrimSpace(body.Content), authorID, authorName).Scan(
			&note.ID, &note.Content, &note.AuthorName, &note.CreatedAt, &note.UpdatedAt,
		)
		if err != nil {
			log.Error("create customer note failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create note"})
			return
		}
		writeJSON(w, http.StatusCreated, note)

	default:
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

func handleCustomerNoteMutation(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, userID, noteID string) {
	switch r.Method {
	case http.MethodPut:
		var body struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Content) == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "content is required"})
			return
		}
		var note customerNoteRow
		err := db.QueryRowContext(r.Context(), `
			UPDATE customer_notes SET content = $1, updated_at = $2
			WHERE id = $3 AND service_provider_id = $4 AND user_id = $5
			RETURNING id, content, author_name, created_at::text, updated_at::text
		`, strings.TrimSpace(body.Content), time.Now(), noteID, spID, userID).Scan(
			&note.ID, &note.Content, &note.AuthorName, &note.CreatedAt, &note.UpdatedAt,
		)
		if err != nil {
			if err == sql.ErrNoRows {
				writeJSON(w, http.StatusNotFound, errorResponse{Error: "note not found"})
			} else {
				log.Error("update customer note failed", zap.Error(err))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to update note"})
			}
			return
		}
		writeJSON(w, http.StatusOK, note)

	case http.MethodDelete:
		result, err := db.ExecContext(r.Context(), `
			DELETE FROM customer_notes WHERE id = $1 AND service_provider_id = $2 AND user_id = $3
		`, noteID, spID, userID)
		if err != nil {
			log.Error("delete customer note failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to delete note"})
			return
		}
		affected, _ := result.RowsAffected()
		if affected == 0 {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "note not found"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"success": true})

	default:
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

// ─── Tags CRUD ────────────────────────────────────────────

func handleCustomerTags(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, userID string) {
	switch r.Method {
	case http.MethodGet:
		rows, err := db.QueryContext(r.Context(), `
			SELECT id, label, COALESCE(color, '') FROM customer_tags
			WHERE service_provider_id = $1 AND user_id = $2
			ORDER BY created_at
		`, spID, userID)
		if err != nil {
			log.Error("list customer tags failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		defer rows.Close()

		tags := make([]customerTagRow, 0)
		for rows.Next() {
			var t customerTagRow
			if err := rows.Scan(&t.ID, &t.Label, &t.Color); err != nil {
				log.Error("scan customer tag failed", zap.Error(err))
				continue
			}
			tags = append(tags, t)
		}
		writeJSON(w, http.StatusOK, tags)

	case http.MethodPost:
		var body struct {
			Label string `json:"label"`
			Color string `json:"color"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || strings.TrimSpace(body.Label) == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "label is required"})
			return
		}

		var tag customerTagRow
		err := db.QueryRowContext(r.Context(), `
			INSERT INTO customer_tags (service_provider_id, user_id, label, color)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (service_provider_id, user_id, label) DO UPDATE SET color = EXCLUDED.color
			RETURNING id, label, COALESCE(color, '')
		`, spID, userID, strings.TrimSpace(body.Label), body.Color).Scan(&tag.ID, &tag.Label, &tag.Color)
		if err != nil {
			log.Error("create customer tag failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to create tag"})
			return
		}
		writeJSON(w, http.StatusCreated, tag)

	default:
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
	}
}

func handleCustomerTagMutation(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, tagID string) {
	if r.Method != http.MethodDelete {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		return
	}

	result, err := db.ExecContext(r.Context(), `
		DELETE FROM customer_tags WHERE id = $1 AND service_provider_id = $2
	`, tagID, spID)
	if err != nil {
		log.Error("delete customer tag failed", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "failed to delete tag"})
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "tag not found"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}
