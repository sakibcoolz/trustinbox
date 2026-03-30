package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/trustinbox/graphql-bff/internal/clients"
	analyticspb "github.com/trustinbox/proto/gen/analytics/v1"
	botpb "github.com/trustinbox/proto/gen/bot/v1"
	commpb "github.com/trustinbox/proto/gen/communication/v1"
	notifpb "github.com/trustinbox/proto/gen/notification/v1"
	webhookpb "github.com/trustinbox/proto/gen/webhook/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
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

func handleProviderNotifications(svc *clients.ServiceClients, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		switch r.Method {
		case http.MethodPost:
			var body struct {
				UserID   string            `json:"userId"`
				Category string            `json:"category"`
				Title    string            `json:"title"`
				Body     string            `json:"body"`
				Priority string            `json:"priority"`
				Metadata map[string]string `json:"metadata"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
			resp, err := svc.Notification.CreateNotification(r.Context(), &notifpb.CreateNotificationRequest{
				UserId:            body.UserID,
				ServiceProviderId: spID,
				Category:          body.Category,
				Title:             body.Title,
				Body:              body.Body,
				Priority:          body.Priority,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusCreated, resp)

		case http.MethodGet:
			resp, err := svc.Notification.ListNotifications(r.Context(), &notifpb.ListNotificationsRequest{
				UserId:   r.URL.Query().Get("userId"),
				Category: r.URL.Query().Get("category"),
				Status:   r.URL.Query().Get("status"),
				Limit:    queryInt(r, "limit", 20),
				Offset:   queryInt(r, "offset", 0),
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

// ─── Callbacks /api/v1/callbacks ───────────────────────────

func handleProviderCallbacks(svc *clients.ServiceClients, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		id := lastPathSegment(r.URL.Path, "/api/v1/callbacks")

		if id != "" {
			// Single callback operations
			switch r.Method {
			case http.MethodGet:
				resp, err := svc.Communication.GetCallbackRequest(r.Context(), &commpb.GetCallbackRequestRequest{
					CallbackRequestId: id,
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)
			default:
				writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			}
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
			resp, err := svc.Communication.CreateCallbackRequest(r.Context(), &commpb.CreateCallbackRequestRequest{
				UserId:            body.UserID,
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
			resp, err := svc.Communication.ListCallbackRequests(r.Context(), &commpb.ListCallbackRequestsRequest{
				UserId: r.URL.Query().Get("userId"),
				Status: r.URL.Query().Get("status"),
				Limit:  queryInt(r, "limit", 20),
				Offset: queryInt(r, "offset", 0),
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

// ─── Messages /api/v1/messages ─────────────────────────────

func handleProviderMessages(svc *clients.ServiceClients, log *zap.Logger) http.HandlerFunc {
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
			resp, err := svc.Communication.SendMessage(r.Context(), &commpb.SendMessageRequest{
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
			resp, err := svc.Communication.ListMessages(r.Context(), &commpb.ListMessagesRequest{
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

// ─── Documents /api/v1/documents ───────────────────────────

func handleProviderDocuments(svc *clients.ServiceClients, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		switch r.Method {
		case http.MethodPost:
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

		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── Campaigns /api/v1/campaigns ───────────────────────────

// Campaigns are a higher-level concept that wraps policy check + batch
// notification sends.  Since no dedicated campaign gRPC service exists yet,
// we use analytics for reads and the notification service for writes.
func handleProviderCampaigns(svc *clients.ServiceClients, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		id := lastPathSegment(r.URL.Path, "/api/v1/campaigns")

		if id != "" && strings.HasSuffix(r.URL.Path, "/analytics") {
			campaignID := lastPathSegment(r.URL.Path, "/api/v1/campaigns")
			resp, err := svc.Analytics.GetCampaignAnalytics(r.Context(), &analyticspb.GetCampaignAnalyticsRequest{
				ServiceProviderId: spID,
				CampaignId:        campaignID,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, resp)
			return
		}

		switch r.Method {
		case http.MethodGet:
			// Return campaign analytics as a summary view
			resp, err := svc.Analytics.GetDashboardStats(r.Context(), &analyticspb.GetDashboardStatsRequest{
				ServiceProviderId: spID,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"campaignsLaunched": resp.CampaignsLaunched,
				"totalSent":         resp.NotificationsSent,
				"deliveryRate":      resp.DeliveryRate,
				"readRate":          resp.ReadRate,
			})
		default:
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
		}
	}
}

// ─── Webhooks /api/v1/webhooks ─────────────────────────────

func handleProviderWebhooks(svc *clients.ServiceClients, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		id := lastPathSegment(r.URL.Path, "/api/v1/webhooks")

		// Deliveries sub-resource: /api/v1/webhooks/{id}/deliveries
		if id != "" && strings.HasSuffix(r.URL.Path, "/deliveries") {
			resp, err := svc.Webhook.ListDeliveries(r.Context(), &webhookpb.ListDeliveriesRequest{
				SubscriptionId:    id,
				ServiceProviderId: spID,
				Limit:             queryInt(r, "limit", 20),
				Offset:            queryInt(r, "offset", 0),
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, resp)
			return
		}

		// Test sub-resource: POST /api/v1/webhooks/{id}/test
		if id != "" && strings.HasSuffix(r.URL.Path, "/test") && r.Method == http.MethodPost {
			resp, err := svc.Webhook.TestSubscription(r.Context(), &webhookpb.TestSubscriptionRequest{
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

		// Single resource
		if id != "" {
			switch r.Method {
			case http.MethodGet:
				resp, err := svc.Webhook.GetSubscription(r.Context(), &webhookpb.GetSubscriptionRequest{
					SubscriptionId:    id,
					ServiceProviderId: spID,
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)

			case http.MethodPut:
				var body struct {
					URL         string   `json:"url"`
					Description string   `json:"description"`
					Events      []string `json:"events"`
					Status      string   `json:"status"`
					NewSecret   string   `json:"newSecret"`
				}
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
					return
				}
				resp, err := svc.Webhook.UpdateSubscription(r.Context(), &webhookpb.UpdateSubscriptionRequest{
					SubscriptionId:    id,
					ServiceProviderId: spID,
					Url:               body.URL,
					Description:       body.Description,
					Events:            body.Events,
					Status:            body.Status,
					NewSecret:         body.NewSecret,
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)

			case http.MethodDelete:
				resp, err := svc.Webhook.DeleteSubscription(r.Context(), &webhookpb.DeleteSubscriptionRequest{
					SubscriptionId:    id,
					ServiceProviderId: spID,
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)

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
			resp, err := svc.Webhook.CreateSubscription(r.Context(), &webhookpb.CreateSubscriptionRequest{
				ServiceProviderId: spID,
				Url:               body.URL,
				Description:       body.Description,
				Events:            body.Events,
				Secret:            body.Secret,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusCreated, resp)

		case http.MethodGet:
			resp, err := svc.Webhook.ListSubscriptions(r.Context(), &webhookpb.ListSubscriptionsRequest{
				ServiceProviderId: spID,
				Status:            r.URL.Query().Get("status"),
				Limit:             queryInt(r, "limit", 20),
				Offset:            queryInt(r, "offset", 0),
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

// ─── Bots /api/v1/bots ────────────────────────────────────

func handleProviderBots(svc *clients.ServiceClients, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		spID := spIDFromCtx(r.Context())
		id := lastPathSegment(r.URL.Path, "/api/v1/bots")

		// Sub-resources: /api/v1/bots/{id}/actions, /config, /analytics
		if id != "" && strings.HasSuffix(r.URL.Path, "/actions") {
			if r.Method == http.MethodGet {
				resp, err := svc.Bot.ListBotActionLogs(r.Context(), &botpb.ListBotActionLogsRequest{
					BotId:             id,
					ServiceProviderId: spID,
					Limit:             queryInt(r, "limit", 20),
					Offset:            queryInt(r, "offset", 0),
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)
			} else if r.Method == http.MethodPost {
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
				resp, err := svc.Bot.ExecuteBotAction(r.Context(), &botpb.ExecuteBotActionRequest{
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
				writeJSON(w, http.StatusOK, resp)
			} else {
				writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			}
			return
		}

		if id != "" && strings.HasSuffix(r.URL.Path, "/config") {
			switch r.Method {
			case http.MethodGet:
				resp, err := svc.Bot.GetBotConfiguration(r.Context(), &botpb.GetBotConfigurationRequest{
					BotId:             id,
					ServiceProviderId: spID,
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)
			case http.MethodPut:
				var body botpb.BotConfiguration
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
					return
				}
				body.BotId = id
				resp, err := svc.Bot.UpdateBotConfiguration(r.Context(), &botpb.UpdateBotConfigurationRequest{
					BotId:             id,
					ServiceProviderId: spID,
					Configuration:     &body,
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)
			default:
				writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			}
			return
		}

		if id != "" && strings.HasSuffix(r.URL.Path, "/analytics") {
			resp, err := svc.Bot.GetBotAnalytics(r.Context(), &botpb.GetBotAnalyticsRequest{
				BotId:             id,
				ServiceProviderId: spID,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, resp)
			return
		}

		// Single resource
		if id != "" {
			switch r.Method {
			case http.MethodGet:
				resp, err := svc.Bot.GetBot(r.Context(), &botpb.GetBotRequest{
					BotId:             id,
					ServiceProviderId: spID,
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)

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
				resp, err := svc.Bot.UpdateBot(r.Context(), &botpb.UpdateBotRequest{
					BotId:             id,
					ServiceProviderId: spID,
					Name:              body.Name,
					Purpose:           body.Purpose,
					Department:        body.Department,
					AvatarUrl:         body.AvatarURL,
					Status:            body.Status,
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)

			case http.MethodDelete:
				resp, err := svc.Bot.DeleteBot(r.Context(), &botpb.DeleteBotRequest{
					BotId:             id,
					ServiceProviderId: spID,
				})
				if err != nil {
					grpcErrToHTTP(w, err, log)
					return
				}
				writeJSON(w, http.StatusOK, resp)

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
				IndustryProfileID string `json:"industryProfileId"`
				AvatarURL         string `json:"avatarUrl"`
				CreatedBySpUserID string `json:"createdBySpUserId"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request body"})
				return
			}
			resp, err := svc.Bot.CreateBot(r.Context(), &botpb.CreateBotRequest{
				ServiceProviderId: spID,
				Name:              body.Name,
				Purpose:           body.Purpose,
				Department:        body.Department,
				IndustryProfileId: body.IndustryProfileID,
				AvatarUrl:         body.AvatarURL,
				CreatedBySpUserId: body.CreatedBySpUserID,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusCreated, resp)

		case http.MethodGet:
			resp, err := svc.Bot.ListBots(r.Context(), &botpb.ListBotsRequest{
				ServiceProviderId: spID,
				Status:            r.URL.Query().Get("status"),
				Limit:             queryInt(r, "limit", 20),
				Offset:            queryInt(r, "offset", 0),
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

// ─── Analytics /api/v1/analytics ───────────────────────────

func handleProviderAnalytics(svc *clients.ServiceClients, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		spID := spIDFromCtx(r.Context())
		sub := lastPathSegment(r.URL.Path, "/api/v1/analytics")

		parseTimes := func() (*timestamppb.Timestamp, *timestamppb.Timestamp) {
			from := r.URL.Query().Get("from")
			to := r.URL.Query().Get("to")
			var fromTS, toTS *timestamppb.Timestamp
			if t, err := parseRFC3339(from); err == nil {
				fromTS = timestamppb.New(t)
			}
			if t, err := parseRFC3339(to); err == nil {
				toTS = timestamppb.New(t)
			}
			return fromTS, toTS
		}

		switch sub {
		case "dashboard", "":
			fromTS, toTS := parseTimes()
			resp, err := svc.Analytics.GetDashboardStats(r.Context(), &analyticspb.GetDashboardStatsRequest{
				ServiceProviderId: spID,
				From:              fromTS,
				To:                toTS,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, resp)

		case "daily":
			fromTS, toTS := parseTimes()
			resp, err := svc.Analytics.GetDailyAnalytics(r.Context(), &analyticspb.GetDailyAnalyticsRequest{
				ServiceProviderId: spID,
				From:              fromTS,
				To:                toTS,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, resp)

		case "notifications":
			fromTS, toTS := parseTimes()
			resp, err := svc.Analytics.GetNotificationAnalytics(r.Context(), &analyticspb.GetNotificationAnalyticsRequest{
				ServiceProviderId: spID,
				From:              fromTS,
				To:                toTS,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, resp)

		case "callbacks":
			fromTS, toTS := parseTimes()
			resp, err := svc.Analytics.GetCallbackAnalytics(r.Context(), &analyticspb.GetCallbackAnalyticsRequest{
				ServiceProviderId: spID,
				From:              fromTS,
				To:                toTS,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, resp)

		case "bots":
			fromTS, toTS := parseTimes()
			botID := r.URL.Query().Get("botId")
			resp, err := svc.Analytics.GetBotPerformanceAnalytics(r.Context(), &analyticspb.GetBotPerformanceAnalyticsRequest{
				ServiceProviderId: spID,
				BotId:             botID,
				From:              fromTS,
				To:                toTS,
			})
			if err != nil {
				grpcErrToHTTP(w, err, log)
				return
			}
			writeJSON(w, http.StatusOK, resp)

		default:
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "unknown analytics sub-resource"})
		}
	}
}

func parseRFC3339(s string) (time.Time, error) {
	return time.Parse(time.RFC3339, s)
}
