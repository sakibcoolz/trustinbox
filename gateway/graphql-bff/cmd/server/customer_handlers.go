package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"go.uber.org/zap"
)

// ─── Customer list ────────────────────────────────────────

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

		// ── List customers ──────────────────────────────────
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

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
		}
		orderDir := "DESC"
		if strings.EqualFold(r.URL.Query().Get("orderByDirection"), "ASC") {
			orderDir = "ASC"
		}

		search := r.URL.Query().Get("search")
		statusFilter := r.URL.Query().Get("status")
		categoryFilter := r.URL.Query().Get("category")

		// Count total
		countQuery := `SELECT COUNT(*) FROM customer_sp_relations csr
			JOIN users u ON u.id = csr.user_id
			LEFT JOIN user_profiles up ON up.user_id = u.id
			WHERE csr.service_provider_id = $1`
		countArgs := []interface{}{spID}
		argN := 2

		if search != "" {
			countQuery += ` AND (COALESCE(up.full_name, u.username) ILIKE $` + strconv.Itoa(argN) + `)`
			countArgs = append(countArgs, "%"+search+"%")
			argN++
		}
		if statusFilter != "" {
			countQuery += ` AND csr.status = $` + strconv.Itoa(argN)
			countArgs = append(countArgs, statusFilter)
			argN++
		}
		if categoryFilter != "" {
			countQuery += ` AND csr.relationship_type = $` + strconv.Itoa(argN)
			countArgs = append(countArgs, categoryFilter)
			argN++
		}

		var totalCount int
		if err := db.QueryRowContext(r.Context(), countQuery, countArgs...).Scan(&totalCount); err != nil {
			log.Error("customer count query failed", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}

		// Fetch rows
		query := `SELECT
				u.id,
				COALESCE(up.full_name, u.username) AS display_name,
				csr.relationship_type,
				COALESCE(csr.last_contact_at, csr.created_at)::text,
				csr.status,
				(csr.total_notifications_sent + csr.total_callbacks + csr.total_conversations) AS interaction_count
			FROM customer_sp_relations csr
			JOIN users u ON u.id = csr.user_id
			LEFT JOIN user_profiles up ON up.user_id = u.id
			WHERE csr.service_provider_id = $1`
		args := []interface{}{spID}
		argIdx := 2

		if search != "" {
			query += ` AND (COALESCE(up.full_name, u.username) ILIKE $` + strconv.Itoa(argIdx) + `)`
			args = append(args, "%"+search+"%")
			argIdx++
		}
		if statusFilter != "" {
			query += ` AND csr.status = $` + strconv.Itoa(argIdx)
			args = append(args, statusFilter)
			argIdx++
		}
		if categoryFilter != "" {
			query += ` AND csr.relationship_type = $` + strconv.Itoa(argIdx)
			args = append(args, categoryFilter)
			argIdx++
		}

		query += ` ORDER BY ` + orderBy + ` ` + orderDir
		query += ` LIMIT $` + strconv.Itoa(argIdx) + ` OFFSET $` + strconv.Itoa(argIdx+1)
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
}

// ─── Customer sub-routes ──────────────────────────────────

func handleCustomerSubRoute(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, virtualID, sub string) {
	if r.Method == http.MethodGet && sub == "" {
		// GET /api/v1/customers/:id — customer detail
		handleCustomerDetail(w, r, db, log, spID, virtualID)
		return
	}

	switch sub {
	case "timeline":
		handleCustomerTimeline(w, r, db, log, spID, virtualID)
	case "notes":
		handleCustomerNotes(w, r, db, log, spID, virtualID)
	case "tags":
		handleCustomerTags(w, r, db, log, spID, virtualID)
	default:
		if strings.HasPrefix(sub, "notes/") || strings.HasPrefix(sub, "tags/") {
			handleCustomerResourceMutation(w, r, db, log, spID, virtualID, sub)
		} else {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "not found"})
		}
	}
}

func handleCustomerDetail(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, virtualID string) {
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
	`, virtualID, spID).Scan(&displayName, &relType, &status, &lastContact,
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

func handleCustomerTimeline(w http.ResponseWriter, _ *http.Request, _ *sql.DB, _ *zap.Logger, _, _ string) {
	// Timeline is a projection — return empty for now
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"nodes":      []interface{}{},
		"totalCount": 0,
	})
}

func handleCustomerNotes(w http.ResponseWriter, _ *http.Request, _ *sql.DB, _ *zap.Logger, _, _ string) {
	writeJSON(w, http.StatusOK, []interface{}{})
}

func handleCustomerTags(w http.ResponseWriter, _ *http.Request, _ *sql.DB, _ *zap.Logger, _, _ string) {
	writeJSON(w, http.StatusOK, []interface{}{})
}

func handleCustomerResourceMutation(w http.ResponseWriter, r *http.Request, _ *sql.DB, _ *zap.Logger, _, _ string, sub string) {
	// Stub for POST/PUT/DELETE on notes/{id} and tags/{id}
	if r.Method == http.MethodPost {
		writeJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
		return
	}
	if r.Method == http.MethodPut {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}
	if r.Method == http.MethodDelete {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
		return
	}
	_ = json.NewEncoder(w) // suppress unused import
	writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
}
