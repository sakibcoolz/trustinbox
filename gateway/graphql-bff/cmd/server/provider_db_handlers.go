package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// ─── Generic query builder ────────────────────────────────

type queryBuilder struct {
	where []string
	args  []interface{}
	argN  int
}

func newQB(spID string) *queryBuilder {
	return &queryBuilder{
		where: []string{"service_provider_id = $1"},
		args:  []interface{}{spID},
		argN:  2,
	}
}

func (qb *queryBuilder) add(clause string, val interface{}) {
	qb.where = append(qb.where, fmt.Sprintf(clause, qb.argN))
	qb.args = append(qb.args, val)
	qb.argN++
}

func (qb *queryBuilder) addILIKE(columns []string, search string) {
	parts := make([]string, len(columns))
	for i, col := range columns {
		parts[i] = fmt.Sprintf("%s ILIKE $%d", col, qb.argN)
	}
	qb.where = append(qb.where, "("+strings.Join(parts, " OR ")+")")
	qb.args = append(qb.args, "%"+search+"%")
	qb.argN++
}

func (qb *queryBuilder) whereClause() string {
	return "WHERE " + strings.Join(qb.where, " AND ")
}

func (qb *queryBuilder) limitOffset(limit, offset int32) (string, []interface{}) {
	s := fmt.Sprintf(" LIMIT $%d OFFSET $%d", qb.argN, qb.argN+1)
	qb.args = append(qb.args, limit, offset)
	return s, qb.args
}

// ─── Callbacks (DB-based) ─────────────────────────────────

func dbListCallbacks(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	limit := queryInt(r, "limit", 25)
	offset := queryInt(r, "offset", 0)
	if limit > 100 {
		limit = 100
	}

	qb := newQB(spID)
	if v := r.URL.Query().Get("status"); v != "" {
		qb.add("status = $%d", v)
	}
	if v := r.URL.Query().Get("search"); v != "" {
		qb.addILIKE([]string{"reason", "details"}, v)
	}

	var total int
	if err := db.QueryRowContext(r.Context(),
		"SELECT COUNT(*) FROM callback_requests "+qb.whereClause(), qb.args...,
	).Scan(&total); err != nil {
		log.Error("count callbacks", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	lo, args := qb.limitOffset(limit, offset)
	q := `SELECT cr.id, cr.user_id, cr.reason, COALESCE(cr.details,''),
	             cr.status, cr.requested_at, cr.responded_at,
	             cr.approved_slot_start, cr.approved_slot_end
	      FROM callback_requests cr ` + qb.whereClause() +
		` ORDER BY cr.requested_at DESC` + lo

	rows, err := db.QueryContext(r.Context(), q, args...)
	if err != nil {
		log.Error("list callbacks", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	type cbRow struct {
		ID              string  `json:"id"`
		UserID          string  `json:"userId"`
		Reason          string  `json:"reason"`
		Details         string  `json:"details"`
		Status          string  `json:"status"`
		RequestedAt     string  `json:"requestedAt"`
		RespondedAt     *string `json:"respondedAt"`
		SlotStart       *string `json:"approvedSlotStart"`
		SlotEnd         *string `json:"approvedSlotEnd"`
		ServiceProvider struct {
			ID string `json:"id"`
		} `json:"serviceProvider"`
	}

	nodes := make([]cbRow, 0)
	for rows.Next() {
		var c cbRow
		var respondedAt, slotStart, slotEnd sql.NullTime
		var requestedAt time.Time
		if err := rows.Scan(&c.ID, &c.UserID, &c.Reason, &c.Details,
			&c.Status, &requestedAt, &respondedAt, &slotStart, &slotEnd); err != nil {
			log.Error("scan callback", zap.Error(err))
			continue
		}
		c.RequestedAt = requestedAt.Format(time.RFC3339)
		if respondedAt.Valid {
			s := respondedAt.Time.Format(time.RFC3339)
			c.RespondedAt = &s
		}
		if slotStart.Valid {
			s := slotStart.Time.Format(time.RFC3339)
			c.SlotStart = &s
		}
		if slotEnd.Valid {
			s := slotEnd.Time.Format(time.RFC3339)
			c.SlotEnd = &s
		}
		c.ServiceProvider.ID = spID
		nodes = append(nodes, c)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"nodes": nodes, "totalCount": total,
	})
}

func dbGetCallback(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, id string) {
	var c struct {
		ID          string  `json:"id"`
		UserID      string  `json:"userId"`
		Reason      string  `json:"reason"`
		Details     string  `json:"details"`
		Status      string  `json:"status"`
		RequestedAt string  `json:"requestedAt"`
		RespondedAt *string `json:"respondedAt"`
		SlotStart   *string `json:"approvedSlotStart"`
		SlotEnd     *string `json:"approvedSlotEnd"`
	}
	var respondedAt, slotStart, slotEnd sql.NullTime
	var requestedAt time.Time
	err := db.QueryRowContext(r.Context(),
		`SELECT id, user_id, reason, COALESCE(details,''), status,
		        requested_at, responded_at, approved_slot_start, approved_slot_end
		 FROM callback_requests WHERE id = $1 AND service_provider_id = $2`,
		id, spID,
	).Scan(&c.ID, &c.UserID, &c.Reason, &c.Details, &c.Status,
		&requestedAt, &respondedAt, &slotStart, &slotEnd)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "callback not found"})
		return
	}
	if err != nil {
		log.Error("get callback", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	c.RequestedAt = requestedAt.Format(time.RFC3339)
	if respondedAt.Valid {
		s := respondedAt.Time.Format(time.RFC3339)
		c.RespondedAt = &s
	}
	if slotStart.Valid {
		s := slotStart.Time.Format(time.RFC3339)
		c.SlotStart = &s
	}
	if slotEnd.Valid {
		s := slotEnd.Time.Format(time.RFC3339)
		c.SlotEnd = &s
	}
	writeJSON(w, http.StatusOK, c)
}

func dbUpdateCallbackStatus(w http.ResponseWriter, r *http.Request, db *sql.DB, rdb *redis.Client, log *zap.Logger, spID, id, action string) {
	var newStatus string
	switch action {
	case "approve":
		newStatus = "APPROVED"
	case "reject":
		newStatus = "REJECTED"
	default:
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "unknown action"})
		return
	}

	// Use RETURNING to get the consumer's user_id for event publishing
	var userID string
	err := db.QueryRowContext(r.Context(),
		`UPDATE callback_requests SET status = $1, responded_at = NOW()
		 WHERE id = $2 AND service_provider_id = $3
		 RETURNING user_id`,
		newStatus, id, spID,
	).Scan(&userID)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "callback not found"})
		return
	}
	if err != nil {
		log.Error("update callback status", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	// Publish domain event so SSE subscribers dispatch real-time notifications
	eventType := "callback.approved"
	if action == "reject" {
		eventType = "callback.rejected"
	}
	envelope, _ := json.Marshal(map[string]interface{}{
		"id":                  uuid.New().String(),
		"type":                eventType,
		"service_provider_id": spID,
		"user_id":             userID,
		"entity_id":           id,
		"payload": map[string]interface{}{
			"callback_request_id": id,
			"user_id":             userID,
			"service_provider_id": spID,
			"status":              newStatus,
		},
		"occurred_at": time.Now().UTC().Format(time.RFC3339),
	})
	channel := "trustinbox:events:" + eventType
	if err := rdb.Publish(r.Context(), channel, envelope).Err(); err != nil {
		log.Error("publish callback event", zap.Error(err), zap.String("event_type", eventType))
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ─── Campaigns (DB-based) ─────────────────────────────────

func dbListCampaigns(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	limit := queryInt(r, "limit", 25)
	offset := queryInt(r, "offset", 0)
	if limit > 100 {
		limit = 100
	}

	qb := newQB(spID)
	if v := r.URL.Query().Get("status"); v != "" {
		qb.add("status = $%d", v)
	}

	var total int
	if err := db.QueryRowContext(r.Context(),
		"SELECT COUNT(*) FROM campaigns "+qb.whereClause(), qb.args...,
	).Scan(&total); err != nil {
		log.Error("count campaigns", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	lo, args := qb.limitOffset(limit, offset)
	q := `SELECT c.id, c.name, c.category, c.title, c.body, c.status,
	             c.scheduled_at, c.created_at, c.updated_at,
	             (SELECT COUNT(*) FROM campaign_targets ct WHERE ct.campaign_id = c.id) as target_count,
	             (SELECT COUNT(*) FROM campaign_targets ct WHERE ct.campaign_id = c.id AND ct.status = 'delivered') as delivered_count,
	             (SELECT COUNT(*) FROM campaign_targets ct WHERE ct.campaign_id = c.id AND ct.status = 'failed') as failed_count
	      FROM campaigns c ` + qb.whereClause() +
		` ORDER BY c.created_at DESC` + lo

	rows, err := db.QueryContext(r.Context(), q, args...)
	if err != nil {
		log.Error("list campaigns", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	type campRow struct {
		ID             string  `json:"id"`
		Name           string  `json:"name"`
		Category       string  `json:"category"`
		Title          string  `json:"title"`
		Body           string  `json:"body"`
		Status         string  `json:"status"`
		ScheduledAt    *string `json:"scheduledAt"`
		CreatedAt      string  `json:"createdAt"`
		UpdatedAt      string  `json:"updatedAt"`
		TargetCount    int     `json:"targetCount"`
		DeliveredCount int     `json:"deliveredCount"`
		FailedCount    int     `json:"failedCount"`
	}

	nodes := make([]campRow, 0)
	for rows.Next() {
		var c campRow
		var scheduledAt sql.NullTime
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&c.ID, &c.Name, &c.Category, &c.Title, &c.Body, &c.Status,
			&scheduledAt, &createdAt, &updatedAt, &c.TargetCount, &c.DeliveredCount, &c.FailedCount); err != nil {
			log.Error("scan campaign", zap.Error(err))
			continue
		}
		c.CreatedAt = createdAt.Format(time.RFC3339)
		c.UpdatedAt = updatedAt.Format(time.RFC3339)
		if scheduledAt.Valid {
			s := scheduledAt.Time.Format(time.RFC3339)
			c.ScheduledAt = &s
		}
		nodes = append(nodes, c)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"nodes": nodes, "totalCount": total,
	})
}

func dbGetCampaign(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, id string) {
	var c struct {
		ID          string  `json:"id"`
		Name        string  `json:"name"`
		Category    string  `json:"category"`
		Title       string  `json:"title"`
		Body        string  `json:"body"`
		Status      string  `json:"status"`
		ScheduledAt *string `json:"scheduledAt"`
		CreatedAt   string  `json:"createdAt"`
		UpdatedAt   string  `json:"updatedAt"`
		TargetCount int     `json:"targetCount"`
	}
	var scheduledAt sql.NullTime
	var createdAt, updatedAt time.Time
	err := db.QueryRowContext(r.Context(),
		`SELECT c.id, c.name, c.category, c.title, c.body, c.status,
		        c.scheduled_at, c.created_at, c.updated_at,
		        (SELECT COUNT(*) FROM campaign_targets ct WHERE ct.campaign_id = c.id)
		 FROM campaigns c WHERE c.id = $1 AND c.service_provider_id = $2`,
		id, spID,
	).Scan(&c.ID, &c.Name, &c.Category, &c.Title, &c.Body, &c.Status,
		&scheduledAt, &createdAt, &updatedAt, &c.TargetCount)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "campaign not found"})
		return
	}
	if err != nil {
		log.Error("get campaign", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	c.CreatedAt = createdAt.Format(time.RFC3339)
	c.UpdatedAt = updatedAt.Format(time.RFC3339)
	if scheduledAt.Valid {
		s := scheduledAt.Time.Format(time.RFC3339)
		c.ScheduledAt = &s
	}
	writeJSON(w, http.StatusOK, c)
}

// ─── Webhooks (DB-based reads) ────────────────────────────

func dbListWebhooks(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	limit := queryInt(r, "limit", 25)
	offset := queryInt(r, "offset", 0)
	if limit > 100 {
		limit = 100
	}

	qb := newQB(spID)
	if v := r.URL.Query().Get("status"); v != "" {
		qb.add("status = $%d", v)
	}

	var total int
	if err := db.QueryRowContext(r.Context(),
		"SELECT COUNT(*) FROM webhook_subscriptions "+qb.whereClause(), qb.args...,
	).Scan(&total); err != nil {
		log.Error("count webhooks", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	lo, args := qb.limitOffset(limit, offset)
	q := `SELECT id, url, COALESCE(description,''), events, status,
	             failure_count, max_retries, last_delivery_at, last_failure_at,
	             created_at, updated_at
	      FROM webhook_subscriptions ` + qb.whereClause() +
		` ORDER BY created_at DESC` + lo

	rows, err := db.QueryContext(r.Context(), q, args...)
	if err != nil {
		log.Error("list webhooks", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	type whRow struct {
		ID             string   `json:"id"`
		URL            string   `json:"url"`
		Description    string   `json:"description"`
		Events         []string `json:"events"`
		Status         string   `json:"status"`
		FailureCount   int      `json:"failureCount"`
		MaxRetries     int      `json:"maxRetries"`
		LastDeliveryAt *string  `json:"lastDeliveryAt"`
		LastFailureAt  *string  `json:"lastFailureAt"`
		CreatedAt      string   `json:"createdAt"`
		UpdatedAt      string   `json:"updatedAt"`
	}

	nodes := make([]whRow, 0)
	for rows.Next() {
		var wh whRow
		var events string // TEXT[] comes as a string
		var lastDel, lastFail sql.NullTime
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&wh.ID, &wh.URL, &wh.Description, &events, &wh.Status,
			&wh.FailureCount, &wh.MaxRetries, &lastDel, &lastFail,
			&createdAt, &updatedAt); err != nil {
			log.Error("scan webhook", zap.Error(err))
			continue
		}
		wh.CreatedAt = createdAt.Format(time.RFC3339)
		wh.UpdatedAt = updatedAt.Format(time.RFC3339)
		wh.Events = pgArrayToSlice(events)
		if lastDel.Valid {
			s := lastDel.Time.Format(time.RFC3339)
			wh.LastDeliveryAt = &s
		}
		if lastFail.Valid {
			s := lastFail.Time.Format(time.RFC3339)
			wh.LastFailureAt = &s
		}
		nodes = append(nodes, wh)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"nodes": nodes, "totalCount": total,
	})
}

func dbGetWebhook(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, id string) {
	var wh struct {
		ID             string   `json:"id"`
		URL            string   `json:"url"`
		Description    string   `json:"description"`
		Events         []string `json:"events"`
		Status         string   `json:"status"`
		FailureCount   int      `json:"failureCount"`
		MaxRetries     int      `json:"maxRetries"`
		LastDeliveryAt *string  `json:"lastDeliveryAt"`
		LastFailureAt  *string  `json:"lastFailureAt"`
		CreatedAt      string   `json:"createdAt"`
		UpdatedAt      string   `json:"updatedAt"`
	}
	var events string
	var lastDel, lastFail sql.NullTime
	var createdAt, updatedAt time.Time
	err := db.QueryRowContext(r.Context(),
		`SELECT id, url, COALESCE(description,''), events, status,
		        failure_count, max_retries, last_delivery_at, last_failure_at,
		        created_at, updated_at
		 FROM webhook_subscriptions WHERE id = $1 AND service_provider_id = $2`,
		id, spID,
	).Scan(&wh.ID, &wh.URL, &wh.Description, &events, &wh.Status,
		&wh.FailureCount, &wh.MaxRetries, &lastDel, &lastFail,
		&createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "webhook not found"})
		return
	}
	if err != nil {
		log.Error("get webhook", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	wh.CreatedAt = createdAt.Format(time.RFC3339)
	wh.UpdatedAt = updatedAt.Format(time.RFC3339)
	wh.Events = pgArrayToSlice(events)
	if lastDel.Valid {
		s := lastDel.Time.Format(time.RFC3339)
		wh.LastDeliveryAt = &s
	}
	if lastFail.Valid {
		s := lastFail.Time.Format(time.RFC3339)
		wh.LastFailureAt = &s
	}
	writeJSON(w, http.StatusOK, wh)
}

func dbListWebhookDeliveries(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, subID string) {
	limit := queryInt(r, "limit", 25)
	offset := queryInt(r, "offset", 0)
	if limit > 100 {
		limit = 100
	}

	var total int
	if err := db.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM webhook_deliveries wd
		 JOIN webhook_subscriptions ws ON ws.id = wd.subscription_id
		 WHERE wd.subscription_id = $1 AND ws.service_provider_id = $2`,
		subID, spID,
	).Scan(&total); err != nil {
		log.Error("count webhook deliveries", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	q := `SELECT wd.id, wd.event_type, COALESCE(wd.event_id,''), wd.status,
	             wd.response_status, wd.attempts, wd.duration_ms, COALESCE(wd.error,''),
	             wd.created_at, wd.delivered_at
	      FROM webhook_deliveries wd
	      JOIN webhook_subscriptions ws ON ws.id = wd.subscription_id
	      WHERE wd.subscription_id = $1 AND ws.service_provider_id = $2
	      ORDER BY wd.created_at DESC LIMIT $3 OFFSET $4`

	rows, err := db.QueryContext(r.Context(), q, subID, spID, limit, offset)
	if err != nil {
		log.Error("list webhook deliveries", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	type delRow struct {
		ID             string  `json:"id"`
		EventType      string  `json:"eventType"`
		EventID        string  `json:"eventId"`
		Status         string  `json:"status"`
		ResponseStatus *int    `json:"responseStatus"`
		Attempts       int     `json:"attempts"`
		DurationMs     *int    `json:"durationMs"`
		Error          string  `json:"error"`
		CreatedAt      string  `json:"createdAt"`
		DeliveredAt    *string `json:"deliveredAt"`
	}

	nodes := make([]delRow, 0)
	for rows.Next() {
		var d delRow
		var respStatus sql.NullInt32
		var durationMs sql.NullInt32
		var deliveredAt sql.NullTime
		var createdAt time.Time
		if err := rows.Scan(&d.ID, &d.EventType, &d.EventID, &d.Status,
			&respStatus, &d.Attempts, &durationMs, &d.Error,
			&createdAt, &deliveredAt); err != nil {
			log.Error("scan webhook delivery", zap.Error(err))
			continue
		}
		d.CreatedAt = createdAt.Format(time.RFC3339)
		if respStatus.Valid {
			v := int(respStatus.Int32)
			d.ResponseStatus = &v
		}
		if durationMs.Valid {
			v := int(durationMs.Int32)
			d.DurationMs = &v
		}
		if deliveredAt.Valid {
			s := deliveredAt.Time.Format(time.RFC3339)
			d.DeliveredAt = &s
		}
		nodes = append(nodes, d)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"nodes": nodes, "totalCount": total,
	})
}

// ─── Analytics (DB-based from analytics_daily) ────────────

func dbAnalyticsDashboard(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	dateWhere, dateArgs := buildDateFilter(spID, from, to)

	var sent, delivered, read, rejected int
	var cbReq, cbApproved, cbRejected int
	var msgSent, msgRecv int
	var campaignsLaunched int
	var policyEvals, policyDenials int

	q := `SELECT
		COALESCE(SUM(notifications_sent),0), COALESCE(SUM(notifications_delivered),0),
		COALESCE(SUM(notifications_read),0), COALESCE(SUM(notifications_rejected),0),
		COALESCE(SUM(callbacks_requested),0), COALESCE(SUM(callbacks_approved),0),
		COALESCE(SUM(callbacks_rejected),0),
		COALESCE(SUM(messages_sent),0), COALESCE(SUM(messages_received),0),
		COALESCE(SUM(campaigns_launched),0),
		COALESCE(SUM(policy_evaluations),0), COALESCE(SUM(policy_denials),0)
	  FROM analytics_daily ` + dateWhere

	if err := db.QueryRowContext(r.Context(), q, dateArgs...).Scan(
		&sent, &delivered, &read, &rejected,
		&cbReq, &cbApproved, &cbRejected,
		&msgSent, &msgRecv,
		&campaignsLaunched,
		&policyEvals, &policyDenials,
	); err != nil && err != sql.ErrNoRows {
		log.Error("analytics dashboard", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	deliveryRate := 0.0
	if sent > 0 {
		deliveryRate = float64(delivered) / float64(sent) * 100
	}
	readRate := 0.0
	if delivered > 0 {
		readRate = float64(read) / float64(delivered) * 100
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"notificationsSent":         sent,
		"previousNotificationsSent": 0,
		"deliveryRate":              deliveryRate,
		"previousDeliveryRate":      0,
		"activeCallbacks":           cbReq,
		"previousActiveCallbacks":   0,
		"openConversations":         msgSent + msgRecv,
		"previousOpenConversations": 0,
		"activeCampaigns":           campaignsLaunched,
		"previousActiveCampaigns":   0,
		"readRate":                  readRate,
		"campaignsLaunched":         campaignsLaunched,
		"dailyDelivery":             []interface{}{},
		"policyBreakdown": map[string]int{
			"allowed":             policyEvals - policyDenials,
			"blockedByDND":        0,
			"blockedByPreference": 0,
			"rateLimited":         0,
			"total":               policyEvals,
		},
		"recentActivity": []interface{}{},
	})
}

func dbAnalyticsDaily(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	dateWhere, dateArgs := buildDateFilter(spID, from, to)

	q := `SELECT date, notifications_sent, notifications_delivered, notifications_read,
	             notifications_rejected, callbacks_requested, messages_sent, messages_received
	      FROM analytics_daily ` + dateWhere + ` ORDER BY date ASC`

	rows, err := db.QueryContext(r.Context(), q, dateArgs...)
	if err != nil {
		log.Error("analytics daily", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	type dailyRow struct {
		Date        string `json:"date"`
		Sent        int    `json:"notificationsSent"`
		Delivered   int    `json:"notificationsDelivered"`
		Read        int    `json:"notificationsRead"`
		Rejected    int    `json:"notificationsRejected"`
		Callbacks   int    `json:"callbacksRequested"`
		MsgSent     int    `json:"messagesSent"`
		MsgReceived int    `json:"messagesReceived"`
	}

	entries := make([]dailyRow, 0)
	for rows.Next() {
		var d dailyRow
		var dt time.Time
		if err := rows.Scan(&dt, &d.Sent, &d.Delivered, &d.Read, &d.Rejected,
			&d.Callbacks, &d.MsgSent, &d.MsgReceived); err != nil {
			log.Error("scan daily analytics", zap.Error(err))
			continue
		}
		d.Date = dt.Format("2006-01-02")
		entries = append(entries, d)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"entries": entries,
	})
}

func dbAnalyticsNotifications(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	dateWhere, dateArgs := buildDateFilter(spID, from, to)

	var sent, delivered, read, rejected int
	q := `SELECT COALESCE(SUM(notifications_sent),0), COALESCE(SUM(notifications_delivered),0),
	             COALESCE(SUM(notifications_read),0), COALESCE(SUM(notifications_rejected),0)
	      FROM analytics_daily ` + dateWhere

	if err := db.QueryRowContext(r.Context(), q, dateArgs...).Scan(&sent, &delivered, &read, &rejected); err != nil && err != sql.ErrNoRows {
		log.Error("analytics notifications", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	deliveryRate := 0.0
	if sent > 0 {
		deliveryRate = float64(delivered) / float64(sent) * 100
	}
	readRate := 0.0
	if delivered > 0 {
		readRate = float64(read) / float64(delivered) * 100
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"totalSent":      sent,
		"totalDelivered": delivered,
		"totalRead":      read,
		"totalRejected":  rejected,
		"deliveryRate":   deliveryRate,
		"readRate":       readRate,
	})
}

func dbAnalyticsCallbacks(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	// If summary=true, return quick stats
	if r.URL.Query().Get("summary") == "true" {
		var pending, approved, rejected, total int
		err := db.QueryRowContext(r.Context(),
			`SELECT
				COUNT(*) FILTER (WHERE status = 'PENDING'),
				COUNT(*) FILTER (WHERE status = 'APPROVED'),
				COUNT(*) FILTER (WHERE status = 'REJECTED'),
				COUNT(*)
			 FROM callback_requests WHERE service_provider_id = $1`, spID,
		).Scan(&pending, &approved, &rejected, &total)
		if err != nil && err != sql.ErrNoRows {
			log.Error("callback stats", zap.Error(err))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]int{
			"pending": pending, "approved": approved, "rejected": rejected, "total": total,
		})
		return
	}

	dateWhere, dateArgs := buildDateFilter(spID, from, to)
	var requested, approved, rejected, expired int
	q := `SELECT COALESCE(SUM(callbacks_requested),0), COALESCE(SUM(callbacks_approved),0),
	             COALESCE(SUM(callbacks_rejected),0), COALESCE(SUM(callbacks_expired),0)
	      FROM analytics_daily ` + dateWhere

	if err := db.QueryRowContext(r.Context(), q, dateArgs...).Scan(&requested, &approved, &rejected, &expired); err != nil && err != sql.ErrNoRows {
		log.Error("analytics callbacks", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"totalRequested": requested,
		"totalApproved":  approved,
		"totalRejected":  rejected,
		"totalExpired":   expired,
		"approvalRate":   safeRate(approved, requested),
	})
}

func dbAnalyticsOverview(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	// Same as dashboard but different shape
	dbAnalyticsDashboard(w, r, db, log, spID)
}

// ─── Helpers ──────────────────────────────────────────────

func buildDateFilter(spID, from, to string) (string, []interface{}) {
	where := "WHERE service_provider_id = $1"
	args := []interface{}{spID}
	n := 2
	if from != "" {
		if t, err := time.Parse(time.RFC3339, from); err == nil {
			where += fmt.Sprintf(" AND date >= $%d", n)
			args = append(args, t.Format("2006-01-02"))
			n++
		}
	}
	if to != "" {
		if t, err := time.Parse(time.RFC3339, to); err == nil {
			where += fmt.Sprintf(" AND date <= $%d", n)
			args = append(args, t.Format("2006-01-02"))
			n++
		}
	}
	return where, args
}

func safeRate(num, denom int) float64 {
	if denom == 0 {
		return 0
	}
	return float64(num) / float64(denom) * 100
}

// pgArrayToSlice converts a PostgreSQL TEXT[] literal like {a,b,c} to a Go slice.
func pgArrayToSlice(raw string) []string {
	raw = strings.TrimPrefix(raw, "{")
	raw = strings.TrimSuffix(raw, "}")
	if raw == "" {
		return []string{}
	}
	return strings.Split(raw, ",")
}

// ─── Campaign Analytics (DB) ────────────────────────────

func dbCampaignAnalytics(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, campaignID string) {
	var totalTargets, totalSent, totalDelivered, totalRead, totalFailed, totalSkipped int
	err := db.QueryRowContext(r.Context(), `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE ct.status IN ('SENT','DELIVERED','READ')),
			COUNT(*) FILTER (WHERE ct.status IN ('DELIVERED','READ')),
			COUNT(*) FILTER (WHERE ct.status = 'READ'),
			COUNT(*) FILTER (WHERE ct.status = 'FAILED'),
			COUNT(*) FILTER (WHERE ct.status = 'SKIPPED')
		FROM campaign_targets ct
		JOIN campaigns c ON c.id = ct.campaign_id
		WHERE ct.campaign_id = $1 AND c.service_provider_id = $2`,
		campaignID, spID,
	).Scan(&totalTargets, &totalSent, &totalDelivered, &totalRead, &totalFailed, &totalSkipped)
	if err != nil {
		log.Error("campaign analytics", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	var deliveryRate, readRate float64
	if totalSent > 0 {
		deliveryRate = float64(totalDelivered) / float64(totalSent)
	}
	if totalDelivered > 0 {
		readRate = float64(totalRead) / float64(totalDelivered)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"totalTargets":   totalTargets,
		"totalSent":      totalSent,
		"totalDelivered": totalDelivered,
		"totalRead":      totalRead,
		"totalFailed":    totalFailed,
		"totalSkipped":   totalSkipped,
		"deliveryRate":   deliveryRate,
		"readRate":       readRate,
	})
}

// ─── Campaign Targets (DB) ──────────────────────────────

func dbCampaignTargets(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, campaignID string) {
	limit := queryInt(r, "limit", 25)
	offset := queryInt(r, "offset", 0)
	if limit > 100 {
		limit = 100
	}

	statusFilter := r.URL.Query().Get("status")
	baseWhere := `ct.campaign_id = $1 AND c.service_provider_id = $2`
	args := []interface{}{campaignID, spID}
	if statusFilter != "" {
		args = append(args, statusFilter)
		baseWhere += fmt.Sprintf(` AND ct.status = $%d`, len(args))
	}

	var total int
	err := db.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM campaign_targets ct JOIN campaigns c ON c.id = ct.campaign_id WHERE `+baseWhere,
		args...,
	).Scan(&total)
	if err != nil {
		log.Error("count campaign targets", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	limitArg := len(args) + 1
	offsetArg := len(args) + 2
	args = append(args, limit, offset)

	rows, err := db.QueryContext(r.Context(),
		fmt.Sprintf(`SELECT ct.id, ct.user_id, ct.status, ct.policy_decision, ct.policy_reason,
		       ct.sent_at, ct.delivered_at, ct.read_at, ct.failed_reason
		FROM campaign_targets ct
		JOIN campaigns c ON c.id = ct.campaign_id
		WHERE %s
		ORDER BY ct.created_at DESC
		LIMIT $%d OFFSET $%d`, baseWhere, limitArg, offsetArg),
		args...,
	)
	if err != nil {
		log.Error("list campaign targets", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	type targetRow struct {
		ID             string  `json:"id"`
		UserID         string  `json:"userId"`
		Status         string  `json:"status"`
		PolicyDecision *string `json:"policyDecision"`
		PolicyReason   *string `json:"policyReason"`
		SentAt         *string `json:"sentAt"`
		DeliveredAt    *string `json:"deliveredAt"`
		ReadAt         *string `json:"readAt"`
		FailedReason   *string `json:"failedReason"`
	}

	nodes := make([]targetRow, 0)
	for rows.Next() {
		var t targetRow
		var pd, pr, fr sql.NullString
		var sa, da, ra sql.NullTime
		if err := rows.Scan(&t.ID, &t.UserID, &t.Status, &pd, &pr, &sa, &da, &ra, &fr); err != nil {
			log.Error("scan campaign target", zap.Error(err))
			continue
		}
		if pd.Valid {
			t.PolicyDecision = &pd.String
		}
		if pr.Valid {
			t.PolicyReason = &pr.String
		}
		if fr.Valid {
			t.FailedReason = &fr.String
		}
		if sa.Valid {
			s := sa.Time.Format(time.RFC3339)
			t.SentAt = &s
		}
		if da.Valid {
			s := da.Time.Format(time.RFC3339)
			t.DeliveredAt = &s
		}
		if ra.Valid {
			s := ra.Time.Format(time.RFC3339)
			t.ReadAt = &s
		}
		nodes = append(nodes, t)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"nodes": nodes, "totalCount": total,
	})
}
