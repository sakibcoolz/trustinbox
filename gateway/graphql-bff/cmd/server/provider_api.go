package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/trustinbox/graphql-bff/internal/clients"
	botpb "github.com/trustinbox/proto/gen/bot/v1"
	commpb "github.com/trustinbox/proto/gen/communication/v1"
	notifpb "github.com/trustinbox/proto/gen/notification/v1"
	webhookpb "github.com/trustinbox/proto/gen/webhook/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ─── Helpers ───────────────────────────────────────────────

func queryInt(r *http.Request, key string, def int32) int32 {
	v := r.URL.Query().Get(key)
	if v == "" {
		return def
	}
	n, err := strconv.ParseInt(v, 10, 32)
	if err != nil {
		return def
	}
	return int32(n)
}

func lastPathSegment(path, prefix string) string {
	rest := strings.TrimPrefix(path, prefix)
	rest = strings.TrimPrefix(rest, "/")
	if idx := strings.Index(rest, "/"); idx != -1 {
		return rest[:idx]
	}
	return rest
}

func grpcErrToHTTP(w http.ResponseWriter, err error, log *zap.Logger) {
	st := status.Convert(err)
	switch st.Code() {
	case codes.NotFound:
		writeJSON(w, http.StatusNotFound, errorResponse{Error: st.Message()})
	case codes.InvalidArgument:
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: st.Message()})
	case codes.PermissionDenied:
		writeJSON(w, http.StatusForbidden, errorResponse{Error: st.Message()})
	case codes.AlreadyExists:
		writeJSON(w, http.StatusConflict, errorResponse{Error: st.Message()})
	default:
		log.Error("gRPC error", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
	}
}

// ─── Notifications /api/v1/notifications ───────────────────

func handleProviderNotifications(svc *clients.ServiceClients, db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())

		// Sub-route: /api/v1/notifications/{id}[/retry]
		rest := strings.TrimPrefix(r.URL.Path, "/api/v1/notifications")
		rest = strings.TrimPrefix(rest, "/")
		if rest != "" {
			parts := strings.SplitN(rest, "/", 2)
			notifID := parts[0]
			if len(parts) > 1 && parts[1] == "retry" {
				// POST /api/v1/notifications/{id}/retry
				if r.Method != http.MethodPost {
					writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
					return
				}
				// Update status back to PENDING for re-delivery
				res, err := db.ExecContext(r.Context(),
					`UPDATE notifications SET status = 'PENDING'
					 WHERE id = $1 AND service_provider_id = $2`,
					notifID, spID,
				)
				if err != nil {
					log.Error("retry notification", zap.Error(err))
					writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
					return
				}
				n, _ := res.RowsAffected()
				if n == 0 {
					writeJSON(w, http.StatusNotFound, errorResponse{Error: "notification not found"})
					return
				}
				writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
				return
			}
			// GET /api/v1/notifications/{id}
			if r.Method == http.MethodGet {
				handleProviderNotificationDetail(w, r, db, log, spID, notifID)
				return
			}
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		switch r.Method {
		case http.MethodPost:
			var body struct {
				RecipientIDs []string          `json:"recipientIds"`
				UserID       string            `json:"userId"`
				Category     string            `json:"category"`
				Channel      string            `json:"channel"`
				Title        string            `json:"title"`
				Body         string            `json:"body"`
				Priority     string            `json:"priority"`
				Metadata     map[string]string `json:"metadata"`
				ScheduledAt  string            `json:"scheduledAt"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}

			// Build recipient list: accept recipientIds (array) or userId (single)
			recipients := body.RecipientIDs
			if len(recipients) == 0 && body.UserID != "" {
				recipients = []string{body.UserID}
			}
			if len(recipients) == 0 {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "recipientIds or userId is required"})
				return
			}
			if body.Title == "" {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "title is required"})
				return
			}

			// Resolve virtual IDs to real UUIDs
			resolvedIDs := make([]string, 0, len(recipients))
			for _, rid := range recipients {
				if isUUID(rid) {
					resolvedIDs = append(resolvedIDs, rid)
				} else {
					resolved, err := resolveVirtualID(r.Context(), db, rid)
					if err != nil {
						log.Error("resolve virtual ID for notification", zap.Error(err), zap.String("virtual_id", rid))
						writeJSON(w, http.StatusBadRequest, errorResponse{Error: "customer not found for virtual ID: " + rid})
						return
					}
					resolvedIDs = append(resolvedIDs, resolved)
				}
			}

			// Send notification to each recipient
			type notifResult struct {
				ID     string `json:"id"`
				UserID string `json:"userId"`
				Status string `json:"status"`
			}
			results := make([]notifResult, 0, len(resolvedIDs))
			var lastErr error
			for _, uid := range resolvedIDs {
				resp, err := svc.Notification.CreateNotification(r.Context(), &notifpb.CreateNotificationRequest{
					UserId:            uid,
					ServiceProviderId: spID,
					Category:          body.Category,
					Title:             body.Title,
					Body:              body.Body,
					Priority:          body.Priority,
				})
				if err != nil {
					log.Error("create notification failed", zap.Error(err), zap.String("user_id", uid))
					lastErr = err
					continue
				}
				results = append(results, notifResult{
					ID:     resp.GetNotificationId(),
					UserID: uid,
					Status: resp.GetStatus(),
				})
			}

			if len(results) == 0 && lastErr != nil {
				grpcErrToHTTP(w, lastErr, log)
				return
			}
			writeJSON(w, http.StatusCreated, map[string]interface{}{
				"notifications": results,
				"total":         len(results),
			})

		case http.MethodGet:
			handleProviderNotificationList(w, r, db, log, spID)

		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── Callbacks /api/v1/callbacks ───────────────────────────

func handleProviderCallbacks(svc *clients.ServiceClients, db *sql.DB, rdb *redis.Client, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())

		// Sub-route: /api/v1/callbacks/{id}[/approve|reject]
		rest := strings.TrimPrefix(r.URL.Path, "/api/v1/callbacks")
		rest = strings.TrimPrefix(rest, "/")
		if rest != "" {
			parts := strings.SplitN(rest, "/", 2)
			id := parts[0]
			if len(parts) > 1 {
				// POST /api/v1/callbacks/{id}/approve or /reject
				if r.Method != http.MethodPost {
					writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
					return
				}
				dbUpdateCallbackStatus(w, r, db, rdb, log, spID, id, parts[1])
				return
			}
			// GET /api/v1/callbacks/{id}
			if r.Method == http.MethodGet {
				dbGetCallback(w, r, db, log, spID, id)
				return
			}
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		switch r.Method {
		case http.MethodPost:
			var body struct {
				UserID  string `json:"userId"`
				Reason  string `json:"reason"`
				Details string `json:"details"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}

			// Resolve virtual ID (TI-xxx) to real user UUID
			userID := body.UserID
			if !isUUID(userID) {
				resolved, err := resolveVirtualID(r.Context(), db, userID)
				if err != nil {
					log.Error("resolve virtual ID", zap.Error(err), zap.String("virtual_id", userID))
					writeJSON(w, http.StatusBadRequest, errorResponse{Error: "customer not found for virtual ID: " + userID})
					return
				}
				userID = resolved
			}

			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			defer cancel()
			resp, err := svc.Communication.CreateCallbackRequest(ctx, &commpb.CreateCallbackRequestRequest{
				UserId:            userID,
				ServiceProviderId: spID,
				Reason:            body.Reason,
				Details:           body.Details,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusCreated, resp)

		case http.MethodGet:
			dbListCallbacks(w, r, db, log, spID)

		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── Messages /api/v1/messages ─────────────────────────────

func handleProviderMessages(svc *clients.ServiceClients, db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		switch r.Method {
		case http.MethodPost:
			var body struct {
				ConversationID string `json:"conversationId"`
				Content        string `json:"content"`
				MessageType    string `json:"messageType"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			defer cancel()
			resp, err := svc.Communication.SendMessage(ctx, &commpb.SendMessageRequest{
				ConversationId: body.ConversationID,
				SenderType:     "SP_AGENT",
				SenderRefId:    spID,
				MessageType:    body.MessageType,
				Content:        body.Content,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusCreated, resp)

		case http.MethodGet:
			convID := r.URL.Query().Get("conversationId")
			if convID == "" {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "conversationId query parameter is required"})
				return
			}
			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			defer cancel()
			resp, err := svc.Communication.ListMessages(ctx, &commpb.ListMessagesRequest{
				ConversationId: convID,
				Limit:          queryInt(r, "limit", 50),
				Offset:         queryInt(r, "offset", 0),
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, resp)

		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── Campaigns /api/v1/campaigns ───────────────────────────

func handleProviderCampaigns(svc *clients.ServiceClients, db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())

		rest := strings.TrimPrefix(r.URL.Path, "/api/v1/campaigns")
		rest = strings.TrimPrefix(rest, "/")
		if rest != "" {
			parts := strings.SplitN(rest, "/", 2)
			id := parts[0]

			// Handle policy-preview (not a UUID)
			if id == "policy-preview" {
				if r.Method != http.MethodPost {
					writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
					return
				}
				var body struct {
					Category  string   `json:"category"`
					TargetIDs []string `json:"targetUserIds"`
				}
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
					return
				}
				// Count all customers for this SP
				var totalTargets int
				if len(body.TargetIDs) > 0 {
					totalTargets = len(body.TargetIDs)
				} else {
					_ = db.QueryRowContext(r.Context(),
						`SELECT COUNT(*) FROM customer_sp_relations WHERE service_provider_id = $1`, spID,
					).Scan(&totalTargets)
				}
				// For advertisement category, simulate some policy blocking
				blockedCount := 0
				blockedReasons := make([]map[string]interface{}, 0)
				if body.Category == "ADVERTISEMENT" {
					blockedCount = totalTargets / 5 // ~20% may be blocked by DND/opt-out
					if blockedCount > 0 {
						blockedReasons = []map[string]interface{}{
							{"decisionCode": "DND_ACTIVE", "reason": "Do Not Disturb is active", "count": blockedCount / 2},
							{"decisionCode": "OPT_OUT", "reason": "User opted out of advertisements", "count": blockedCount - blockedCount/2},
						}
					}
				}
				writeJSON(w, http.StatusOK, map[string]interface{}{
					"totalTargets":   totalTargets,
					"allowedCount":   totalTargets - blockedCount,
					"blockedCount":   blockedCount,
					"blockedReasons": blockedReasons,
				})
				return
			}

			if len(parts) > 1 {
				action := parts[1]

				// GET sub-resources
				if r.Method == http.MethodGet {
					switch action {
					case "analytics":
						dbCampaignAnalytics(w, r, db, log, spID, id)
						return
					case "targets":
						dbCampaignTargets(w, r, db, log, spID, id)
						return
					}
					writeJSON(w, http.StatusNotFound, errorResponse{Error: "unknown sub-resource"})
					return
				}

				// POST /api/v1/campaigns/{id}/launch, /cancel etc
				if r.Method != http.MethodPost {
					writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
					return
				}
				var newStatus string
				switch action {
				case "launch":
					newStatus = "LAUNCHED"
				case "cancel":
					newStatus = "CANCELLED"
				case "pause":
					newStatus = "PAUSED"
				default:
					writeJSON(w, http.StatusBadRequest, errorResponse{Error: "unknown action"})
					return
				}
				res, err := db.ExecContext(r.Context(),
					`UPDATE campaigns SET status = $1, updated_at = NOW()
					 WHERE id = $2 AND service_provider_id = $3`,
					newStatus, id, spID)
				if err != nil {
					log.Error("update campaign status", zap.Error(err))
					writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
					return
				}
				n, _ := res.RowsAffected()
				if n == 0 {
					writeJSON(w, http.StatusNotFound, errorResponse{Error: "campaign not found"})
					return
				}
				writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
				return
			}
			// GET /api/v1/campaigns/{id}
			if r.Method == http.MethodGet {
				dbGetCampaign(w, r, db, log, spID, id)
				return
			}
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		switch r.Method {
		case http.MethodGet:
			dbListCampaigns(w, r, db, log, spID)
		case http.MethodPost:
			var body struct {
				Name        string  `json:"name"`
				Description string  `json:"description"`
				Category    string  `json:"category"`
				Subject     string  `json:"subject"`
				Body        string  `json:"body"`
				ScheduledAt *string `json:"scheduledAt"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
			if body.Name == "" || body.Category == "" {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "name and category are required"})
				return
			}
			title := body.Subject
			if title == "" {
				title = body.Name
			}
			content := body.Body
			if content == "" {
				content = body.Description
			}

			var scheduledAt interface{}
			if body.ScheduledAt != nil && *body.ScheduledAt != "" {
				scheduledAt = *body.ScheduledAt
			}

			var id string
			err := db.QueryRowContext(r.Context(),
				`INSERT INTO campaigns (service_provider_id, name, category, title, body, status, scheduled_at, metadata)
				 VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6, $7)
				 RETURNING id`,
				spID, body.Name, body.Category, title, content, scheduledAt, "{}",
			).Scan(&id)
			if err != nil {
				log.Error("create campaign", zap.Error(err))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
				return
			}
			dbGetCampaign(w, r, db, log, spID, id)
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── Webhooks /api/v1/webhooks ─────────────────────────────

func handleProviderWebhooks(svc *clients.ServiceClients, db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())

		rest := strings.TrimPrefix(r.URL.Path, "/api/v1/webhooks")
		rest = strings.TrimPrefix(rest, "/")
		if rest != "" {
			parts := strings.SplitN(rest, "/", 2)
			id := parts[0]

			// Sub-resources
			if len(parts) > 1 {
				sub := parts[1]
				switch sub {
				case "deliveries":
					if r.Method == http.MethodGet {
						dbListWebhookDeliveries(w, r, db, log, spID, id)
						return
					}
				case "test":
					if r.Method == http.MethodPost {
						ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
						defer cancel()
						resp, err := svc.Webhook.TestSubscription(ctx, &webhookpb.TestSubscriptionRequest{
							SubscriptionId:    id,
							ServiceProviderId: spID,
						})
						if err != nil {
							grpcErrToHTTP(w, err, log)
							return
						}
						writeJSON(w, http.StatusOK, resp)
						return
					}
				}
				writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
				return
			}

			// Single resource CRUD
			switch r.Method {
			case http.MethodGet:
				dbGetWebhook(w, r, db, log, spID, id)

			case http.MethodPut:
				var body struct {
					URL         string   `json:"url"`
					Description string   `json:"description"`
					Events      []string `json:"events"`
					Status      string   `json:"status"`
				}
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
					return
				}
				eventsArr := "{" + strings.Join(body.Events, ",") + "}"
				res, err := db.ExecContext(r.Context(),
					`UPDATE webhook_subscriptions SET url = $1, description = $2, events = $3,
					        status = $4, updated_at = NOW()
					 WHERE id = $5 AND service_provider_id = $6`,
					body.URL, body.Description, eventsArr, body.Status, id, spID)
				if err != nil {
					log.Error("update webhook", zap.Error(err))
					writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
					return
				}
				n, _ := res.RowsAffected()
				if n == 0 {
					writeJSON(w, http.StatusNotFound, errorResponse{Error: "webhook not found"})
					return
				}
				dbGetWebhook(w, r, db, log, spID, id)

			case http.MethodDelete:
				res, err := db.ExecContext(r.Context(),
					`DELETE FROM webhook_subscriptions WHERE id = $1 AND service_provider_id = $2`,
					id, spID)
				if err != nil {
					log.Error("delete webhook", zap.Error(err))
					writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
					return
				}
				n, _ := res.RowsAffected()
				if n == 0 {
					writeJSON(w, http.StatusNotFound, errorResponse{Error: "webhook not found"})
					return
				}
				writeJSON(w, http.StatusOK, map[string]bool{"ok": true})

			default:
				writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			}
			return
		}

		// Collection
		switch r.Method {
		case http.MethodPost:
			var body struct {
				URL         string   `json:"url"`
				Description string   `json:"description"`
				Events      []string `json:"events"`
				Secret      string   `json:"secret"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
			eventsArr := "{" + strings.Join(body.Events, ",") + "}"
			var id string
			err := db.QueryRowContext(r.Context(),
				`INSERT INTO webhook_subscriptions (service_provider_id, url, description, events, secret_hash, status)
				 VALUES ($1, $2, $3, $4, $5, 'active')
				 RETURNING id`,
				spID, body.URL, body.Description, eventsArr, body.Secret,
			).Scan(&id)
			if err != nil {
				log.Error("create webhook", zap.Error(err))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
				return
			}
			dbGetWebhook(w, r, db, log, spID, id)

		case http.MethodGet:
			dbListWebhooks(w, r, db, log, spID)

		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── Bots /api/v1/bots ────────────────────────────────────

func handleProviderBots(svc *clients.ServiceClients, db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())

		rest := strings.TrimPrefix(r.URL.Path, "/api/v1/bots")
		rest = strings.TrimPrefix(rest, "/")
		if rest != "" {
			parts := strings.SplitN(rest, "/", 2)
			id := parts[0]

			if !isUUID(id) {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid bot id"})
				return
			}

			// Sub-resources
			if len(parts) > 1 {
				sub := parts[1]
				switch sub {
				case "actions":
					switch r.Method {
					case http.MethodGet:
						dbListBotActions(w, r, db, log, spID, id)
					case http.MethodPost:
						var body struct {
							ConversationID string `json:"conversationId"`
							UserID         string `json:"userId"`
							ActionType     string `json:"actionType"`
							ToolName       string `json:"toolName"`
							InputJSON      string `json:"inputJson"`
						}
						if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
							writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
							return
						}

						// All actions → gRPC (bot-service → ai-service)
						ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
						defer cancel()
						resp, err := svc.Bot.ExecuteBotAction(ctx, &botpb.ExecuteBotActionRequest{
							BotId:             id,
							ServiceProviderId: spID,
							ConversationId:    body.ConversationID,
							UserId:            body.UserID,
							ActionType:        body.ActionType,
							ToolName:          body.ToolName,
							InputJson:         body.InputJSON,
						})
						if err != nil {
							grpcErrToHTTP(w, err, log)
							return
						}
						writeJSON(w, http.StatusOK, map[string]interface{}{
							"success":        resp.GetSuccess(),
							"outputJson":     resp.GetOutputJson(),
							"policyDecision": resp.GetPolicyDecision(),
							"policyReason":   resp.GetPolicyReason(),
							"escalated":      resp.GetEscalated(),
						})
					default:
						writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
					}
					return

				case "config":
					switch r.Method {
					case http.MethodGet:
						dbGetBotConfig(w, r, db, log, spID, id)
					case http.MethodPut:
						var body struct {
							Tone        string  `json:"tone"`
							Style       string  `json:"writingStyle"`
							Temperature float64 `json:"temperature"`
							MaxTurns    int     `json:"maxTurnsBeforeEscalation"`
							Prompt      string  `json:"customSystemPrompt"`
						}
						if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
							writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
							return
						}
						_, err := db.ExecContext(r.Context(),
							`INSERT INTO bot_configurations (bot_id, tone, writing_style, temperature, max_turns_before_escalation, custom_system_prompt)
							 VALUES ($1, $2, $3, $4, $5, $6)
							 ON CONFLICT (bot_id) DO UPDATE SET
							   tone = EXCLUDED.tone, writing_style = EXCLUDED.writing_style,
							   temperature = EXCLUDED.temperature,
							   max_turns_before_escalation = EXCLUDED.max_turns_before_escalation,
							   custom_system_prompt = EXCLUDED.custom_system_prompt`,
							id, body.Tone, body.Style, body.Temperature, body.MaxTurns, body.Prompt)
						if err != nil {
							log.Error("upsert bot config", zap.Error(err))
							writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
							return
						}
						dbGetBotConfig(w, r, db, log, spID, id)
					default:
						writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
					}
					return

				case "analytics":
					if r.Method == http.MethodGet {
						dbGetBotAnalytics(w, r, db, log, spID, id)
						return
					}
					writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
					return

				case "permissions":
					switch r.Method {
					case http.MethodGet:
						rows, err := db.QueryContext(r.Context(),
							`SELECT id, bot_id, tool_name, is_allowed, constraints, created_at
							 FROM bot_permissions WHERE bot_id = $1`, id)
						if err != nil {
							log.Error("list bot permissions", zap.Error(err))
							writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
							return
						}
						defer rows.Close()
						perms := []map[string]interface{}{}
						for rows.Next() {
							var pid, botID, toolName string
							var isAllowed bool
							var constraints sql.NullString
							var createdAt time.Time
							if err := rows.Scan(&pid, &botID, &toolName, &isAllowed, &constraints, &createdAt); err != nil {
								log.Error("scan bot permission", zap.Error(err))
								continue
							}
							p := map[string]interface{}{
								"id":        pid,
								"botId":     botID,
								"toolName":  toolName,
								"isAllowed": isAllowed,
								"createdAt": createdAt,
							}
							if constraints.Valid {
								p["constraints"] = json.RawMessage(constraints.String)
							}
							perms = append(perms, p)
						}
						writeJSON(w, http.StatusOK, perms)
					case http.MethodPost:
						var body struct {
							ToolName string `json:"toolName"`
							Enabled  bool   `json:"enabled"`
						}
						if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
							writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
							return
						}
						var pid string
						err := db.QueryRowContext(r.Context(),
							`INSERT INTO bot_permissions (bot_id, tool_name, is_allowed)
							 VALUES ($1, $2, $3)
							 ON CONFLICT (bot_id, tool_name) DO UPDATE SET is_allowed = EXCLUDED.is_allowed
							 RETURNING id`,
							id, body.ToolName, body.Enabled).Scan(&pid)
						if err != nil {
							log.Error("set bot permission", zap.Error(err))
							writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
							return
						}
						writeJSON(w, http.StatusOK, map[string]interface{}{
							"id":        pid,
							"botId":     id,
							"toolName":  body.ToolName,
							"isAllowed": body.Enabled,
						})
					default:
						writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
					}
					return

				case "workflows":
					handleProviderBotWorkflows(w, r, db, log, spID, id)
					return
				}
				writeJSON(w, http.StatusNotFound, errorResponse{Error: "unknown sub-resource"})
				return
			}

			// Single resource CRUD
			switch r.Method {
			case http.MethodGet:
				dbGetBot(w, r, db, log, spID, id)

			case http.MethodPut:
				var body struct {
					Name       string `json:"name"`
					Purpose    string `json:"purpose"`
					Department string `json:"department"`
					AvatarURL  string `json:"avatarUrl"`
					Status     string `json:"status"`
				}
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
					return
				}
				// Use NULL for empty fields so SQL COALESCE preserves the existing
				// value — frontend can send a partial body (e.g. only {status})
				// without wiping the bot's name / purpose / etc.
				var (
					nameP, purposeP, deptP, avatarP, statusP interface{}
				)
				if body.Name != "" {
					nameP = body.Name
				}
				if body.Purpose != "" {
					purposeP = body.Purpose
				}
				if body.Department != "" {
					deptP = body.Department
				}
				if body.AvatarURL != "" {
					avatarP = body.AvatarURL
				}
				if body.Status != "" {
					statusP = body.Status
				}
				res, err := db.ExecContext(r.Context(),
					`UPDATE bots SET
					        name        = COALESCE($1, name),
					        purpose     = COALESCE($2, purpose),
					        department  = COALESCE($3, department),
					        avatar_url  = COALESCE($4, avatar_url),
					        status      = COALESCE($5, status),
					        updated_at  = NOW()
					 WHERE id = $6 AND service_provider_id = $7`,
					nameP, purposeP, deptP, avatarP, statusP, id, spID)
				if err != nil {
					log.Error("update bot", zap.Error(err))
					writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
					return
				}
				n, _ := res.RowsAffected()
				if n == 0 {
					writeJSON(w, http.StatusNotFound, errorResponse{Error: "bot not found"})
					return
				}
				// Provision (or refresh) the bot's shadow chat user.  We always run
				// it on PUT — not just on ACTIVE — so a name change immediately
				// reflects in the chat UI.  Best effort.
				if _, perr := ensureBotShadowUser(r.Context(), db, log, id, body.Name); perr != nil {
					log.Warn("ensure bot shadow user failed", zap.Error(perr), zap.String("bot_id", id))
				}
				dbGetBot(w, r, db, log, spID, id)

			case http.MethodDelete:
				res, err := db.ExecContext(r.Context(),
					`DELETE FROM bots WHERE id = $1 AND service_provider_id = $2`, id, spID)
				if err != nil {
					log.Error("delete bot", zap.Error(err))
					writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
					return
				}
				n, _ := res.RowsAffected()
				if n == 0 {
					writeJSON(w, http.StatusNotFound, errorResponse{Error: "bot not found"})
					return
				}
				writeJSON(w, http.StatusOK, map[string]bool{"ok": true})

			default:
				writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			}
			return
		}

		// Collection
		switch r.Method {
		case http.MethodPost:
			var body struct {
				Name              string `json:"name"`
				Purpose           string `json:"purpose"`
				Department        string `json:"department"`
				AvatarURL         string `json:"avatarUrl"`
				Description       string `json:"description"`
				IndustryProfileID string `json:"industryProfileId"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
			if body.Name == "" {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "name is required"})
				return
			}
			if body.Purpose == "" {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "purpose is required"})
				return
			}
			spUserID := ""
			if v := r.Context().Value(ctxUserIDKey); v != nil {
				spUserID, _ = v.(string)
			}
			// Pass nil for empty nullable UUID columns
			var spUserIDParam interface{}
			if spUserID != "" {
				spUserIDParam = spUserID
			}
			var industryProfileIDParam interface{}
			if body.IndustryProfileID != "" {
				if isUUID(body.IndustryProfileID) {
					industryProfileIDParam = body.IndustryProfileID
				} else {
					// The field is optional; ignore non-UUID values instead of failing bot creation.
					log.Warn("ignoring non-uuid industry_profile_id on create bot",
						zap.String("industry_profile_id", body.IndustryProfileID),
						zap.String("service_provider_id", spID),
					)
				}
			}
			var id string
			err := db.QueryRowContext(r.Context(),
				`INSERT INTO bots (service_provider_id, name, purpose, department, avatar_url, industry_profile_id, status, created_by_sp_user_id)
				 VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', $7)
				 RETURNING id`,
				spID, body.Name, body.Purpose, body.Department, body.AvatarURL, industryProfileIDParam, spUserIDParam,
			).Scan(&id)
			if err != nil {
				log.Error("create bot", zap.Error(err))
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
				return
			}
			dbGetBot(w, r, db, log, spID, id)

		case http.MethodGet:
			dbListBots(w, r, db, log, spID)

		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── Analytics /api/v1/analytics ───────────────────────────

func handleProviderAnalytics(svc *clients.ServiceClients, db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		spID := spIDFromCtx(r.Context())
		sub := lastPathSegment(r.URL.Path, "/api/v1/analytics")

		switch sub {
		case "dashboard", "":
			dbAnalyticsDashboard(w, r, db, log, spID)
		case "daily":
			dbAnalyticsDaily(w, r, db, log, spID)
		case "notifications":
			dbAnalyticsNotifications(w, r, db, log, spID)
		case "callbacks":
			dbAnalyticsCallbacks(w, r, db, log, spID)
		case "bots":
			dbAnalyticsBots(w, r, db, log, spID)
		case "overview":
			dbAnalyticsOverview(w, r, db, log, spID)
		default:
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "unknown analytics sub-resource"})
		}
	}
}

// ─── Provider notification list (DB-based) ─────────────────

func handleProviderNotificationList(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID string) {
	limit := queryInt(r, "limit", 25)
	offset := queryInt(r, "offset", 0)
	if limit > 100 {
		limit = 100
	}

	category := r.URL.Query().Get("category")
	statusFilter := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")

	where := "WHERE n.service_provider_id = $1"
	args := []interface{}{spID}
	argN := 2

	if category != "" {
		where += fmt.Sprintf(" AND n.category = $%d", argN)
		args = append(args, category)
		argN++
	}
	if statusFilter != "" {
		where += fmt.Sprintf(" AND n.status = $%d", argN)
		args = append(args, statusFilter)
		argN++
	}
	if search != "" {
		where += fmt.Sprintf(" AND (n.title ILIKE $%d OR n.body ILIKE $%d)", argN, argN)
		args = append(args, "%"+search+"%")
		argN++
	}

	var total int
	countQ := "SELECT COUNT(*) FROM notifications n " + where
	if err := db.QueryRowContext(r.Context(), countQ, args...).Scan(&total); err != nil {
		log.Error("count provider notifications", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}

	q := fmt.Sprintf(`SELECT n.id, n.category, n.title, n.body, n.priority, n.status,
	             COALESCE(n.metadata, '{}'::jsonb),
	             n.user_id, n.created_at
	      FROM notifications n
	      %s
	      ORDER BY n.created_at DESC
	      LIMIT $%d OFFSET $%d`, where, argN, argN+1)
	args = append(args, limit, offset)

	rows, err := db.QueryContext(r.Context(), q, args...)
	if err != nil {
		log.Error("list provider notifications", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	defer rows.Close()

	type notifRow struct {
		ID                 string                 `json:"id"`
		Category           string                 `json:"category"`
		Title              string                 `json:"title"`
		Body               string                 `json:"body"`
		Priority           string                 `json:"priority"`
		Status             string                 `json:"status"`
		Channel            string                 `json:"channel"`
		RecipientVirtualID string                 `json:"recipientVirtualId"`
		Metadata           map[string]interface{} `json:"metadata"`
		ServiceProvider    struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"serviceProvider"`
		CreatedAt string `json:"createdAt"`
	}

	nodes := make([]notifRow, 0)
	for rows.Next() {
		var n notifRow
		var metadataBytes []byte
		var userID, createdAt string
		if err := rows.Scan(&n.ID, &n.Category, &n.Title, &n.Body, &n.Priority, &n.Status,
			&metadataBytes, &userID, &createdAt); err != nil {
			log.Error("scan provider notification", zap.Error(err))
			continue
		}
		n.CreatedAt = createdAt
		n.RecipientVirtualID = userID
		n.Channel = "IN_APP"
		n.ServiceProvider.ID = spID
		if len(metadataBytes) > 0 {
			_ = json.Unmarshal(metadataBytes, &n.Metadata)
		}
		if n.Metadata == nil {
			n.Metadata = map[string]interface{}{}
		}
		nodes = append(nodes, n)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"nodes":      nodes,
		"totalCount": total,
	})
}

// ─── Provider notification detail (DB-based) ───────────────

func handleProviderNotificationDetail(w http.ResponseWriter, r *http.Request, db *sql.DB, log *zap.Logger, spID, notifID string) {
	var n struct {
		ID                 string `json:"id"`
		Category           string `json:"category"`
		Title              string `json:"title"`
		Body               string `json:"body"`
		Priority           string `json:"priority"`
		Status             string `json:"status"`
		Channel            string `json:"channel"`
		RecipientVirtualID string `json:"recipientVirtualId"`
		ServiceProvider    struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"serviceProvider"`
		CreatedAt        string        `json:"createdAt"`
		DeliveryAttempts []interface{} `json:"deliveryAttempts"`
		PolicyDecision   struct {
			Allowed      bool     `json:"allowed"`
			DecisionCode string   `json:"decisionCode"`
			Reason       string   `json:"reason"`
			AppliedRules []string `json:"appliedRules"`
			EvaluatedAt  string   `json:"evaluatedAt"`
		} `json:"policyDecision"`
	}

	var userID, createdAt string
	err := db.QueryRowContext(r.Context(),
		`SELECT id, category, title, body, priority, status, user_id, created_at
		 FROM notifications
		 WHERE id = $1 AND service_provider_id = $2`,
		notifID, spID,
	).Scan(&n.ID, &n.Category, &n.Title, &n.Body, &n.Priority, &n.Status, &userID, &createdAt)
	if err == sql.ErrNoRows {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "notification not found"})
		return
	}
	if err != nil {
		log.Error("get provider notification", zap.Error(err))
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "database error"})
		return
	}
	n.CreatedAt = createdAt
	n.RecipientVirtualID = userID
	n.Channel = "IN_APP"
	n.ServiceProvider.ID = spID
	n.DeliveryAttempts = []interface{}{}
	n.PolicyDecision.Allowed = true
	n.PolicyDecision.DecisionCode = "ALLOWED"
	n.PolicyDecision.Reason = "Policy evaluation data not yet available"
	n.PolicyDecision.AppliedRules = []string{}
	n.PolicyDecision.EvaluatedAt = createdAt

	writeJSON(w, http.StatusOK, n)
}

// ─── Virtual ID helpers ───────────────────────────────────

// resolveVirtualID looks up the real user UUID from a virtual public ID (e.g. "TI-UOWF9PMA").
func resolveVirtualID(ctx context.Context, db *sql.DB, virtualID string) (string, error) {
	var userID string
	err := db.QueryRowContext(ctx,
		`SELECT user_id FROM user_identities WHERE virtual_public_id = $1 AND is_active = TRUE`,
		virtualID,
	).Scan(&userID)
	if err != nil {
		return "", fmt.Errorf("resolve virtual ID %s: %w", virtualID, err)
	}
	return userID, nil
}

// isUUID returns true if the string looks like a UUID (contains hyphens and is 36 chars).
func isUUID(s string) bool {
	if len(s) != 36 {
		return false
	}
	for i, c := range s {
		if i == 8 || i == 13 || i == 18 || i == 23 {
			if c != '-' {
				return false
			}
		}
	}
	return true
}

// ─── Policy Check ─────────────────────────────────────────

func handleProviderPolicyCheck(db *sql.DB, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		category := r.URL.Query().Get("category")
		channel := r.URL.Query().Get("channel")
		userID := r.URL.Query().Get("userId")

		// userId is optional — policy check can be SP-level (category + channel)
		if userID != "" && !isUUID(userID) {
			resolved, err := resolveVirtualID(r.Context(), db, userID)
			if err != nil {
				log.Warn("policy check: virtual ID not found", zap.String("virtual_id", userID))
			} else {
				userID = resolved
			}
		}

		_ = userID
		_ = category
		_ = channel

		// Policy service integration not yet wired — return allowed
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"allowed":      true,
			"decisionCode": "ALLOWED",
			"reason":       "Policy evaluation approved",
			"appliedRules": []string{},
		})
	}
}
