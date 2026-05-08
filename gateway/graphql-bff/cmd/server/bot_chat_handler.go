package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/trustinbox/graphql-bff/internal/clients"
	botpb "github.com/trustinbox/proto/gen/bot/v1"
	"go.uber.org/zap"

	"github.com/trustinbox/cornerstone/auth/jwt"
)

// ─── Customer Bot Chat ────────────────────────────────────
//
// POST /api/bots/{botId}/chat
//
// Customer-facing endpoint. Sends a single message to an ACTIVE bot and
// returns the AI-generated response.  Uses the user's Bearer token (same as
// all other customer API routes).  The service-provider ID is required so we
// can verify the bot belongs to that SP before forwarding to the bot-service.

func handleCustomerBotChat(svc *clients.ServiceClients, db *sql.DB, tokenSvc *jwt.TokenService, log *zap.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Only POST is supported.
		if r.Method != http.MethodPost {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: "method not allowed"})
			return
		}

		// Extract bot ID from path: /api/bots/{botId}/chat
		rest := strings.TrimPrefix(r.URL.Path, "/api/bots/")
		parts := strings.SplitN(rest, "/", 2)
		if len(parts) < 2 || parts[1] != "chat" {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "not found"})
			return
		}
		botID := parts[0]
		if !isUUID(botID) {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid bot id"})
			return
		}

		// Authenticate the customer.
		userID, err := extractUserID(r, tokenSvc)
		if err != nil {
			writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "unauthorized"})
			return
		}

		// Parse request body.
		var body struct {
			Message           string `json:"message"`
			ServiceProviderID string `json:"serviceProviderId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Message == "" {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "message is required"})
			return
		}

		// Resolve the SP ID and verify the bot is the SP's MANAGER.
		// Per product rule #9, consumer apps may only chat with MANAGER bots;
		// sub-agents are reachable solely via Manager-driven delegation on the
		// backend.
		var (
			botSPID   string
			agentType string
			botStatus string
		)
		if err := db.QueryRowContext(r.Context(),
			`SELECT service_provider_id, agent_type, status FROM bots WHERE id = $1`, botID,
		).Scan(&botSPID, &agentType, &botStatus); err != nil {
			if err == sql.ErrNoRows {
				writeJSON(w, http.StatusNotFound, errorResponse{Error: "bot not found"})
				return
			}
			log.Error("bot lookup failed", zap.Error(err), zap.String("bot_id", botID))
			writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal error"})
			return
		}
		if botStatus != "ACTIVE" {
			writeJSON(w, http.StatusNotFound, errorResponse{Error: "bot not active"})
			return
		}
		if agentType != "MANAGER" {
			log.Warn("consumer attempted to chat with non-manager bot",
				zap.String("bot_id", botID), zap.String("agent_type", agentType), zap.String("user_id", userID))
			writeJSON(w, http.StatusForbidden, errorResponse{Error: "consumer apps may only chat with the service provider's manager bot"})
			return
		}
		spID := body.ServiceProviderID
		if spID == "" {
			spID = botSPID
		} else if spID != botSPID {
			writeJSON(w, http.StatusBadRequest, errorResponse{Error: "service provider mismatch"})
			return
		}

		// Build the inputJSON expected by the bot-service test_prompt handler.
		inputBytes, _ := json.Marshal(map[string]string{"message": body.Message})

		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()

		resp, err := svc.Bot.ExecuteBotAction(ctx, &botpb.ExecuteBotActionRequest{
			BotId:             botID,
			ServiceProviderId: spID,
			UserId:            userID,
			ActionType:        "test_prompt", // test_prompt skips the active-status gate — bot is ACTIVE here anyway
			InputJson:         string(inputBytes),
		})
		if err != nil {
			grpcErrToHTTP(w, err, log)
			return
		}

		// Decode the nested JSON returned by the bot-service so the client gets a
		// flat object: { response, model, provider, tokensUsed }.
		var inner map[string]interface{}
		if jsonErr := json.Unmarshal([]byte(resp.GetOutputJson()), &inner); jsonErr != nil {
			inner = map[string]interface{}{"response": resp.GetOutputJson()}
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":    resp.GetSuccess(),
			"response":   inner["response"],
			"model":      inner["model"],
			"provider":   inner["provider"],
			"tokensUsed": inner["tokens_used"],
			"escalated":  resp.GetEscalated(),
		})
	}
}
