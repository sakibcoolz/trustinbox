package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/tracing"
	aiv1 "github.com/trustinbox/proto/gen/ai/v1"
	communicationv1 "github.com/trustinbox/proto/gen/communication/v1"
	documentv1 "github.com/trustinbox/proto/gen/document/v1"
	notificationv1 "github.com/trustinbox/proto/gen/notification/v1"
	policyv1 "github.com/trustinbox/proto/gen/policy/v1"
	userv1 "github.com/trustinbox/proto/gen/user/v1"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

// ─── Tool Dispatch ─────────────────────────────────────────────────────────

// dispatchTool routes the tool name to the correct implementation.
// All tools share: botID, spID, conversationID, userID, inputJSON.
// Returns (outputJSON, error).
func (uc *BotUseCase) dispatchTool(
	ctx context.Context,
	botID, spID, conversationID, userID, toolName, inputJSON string,
) (string, error) {
	switch toolName {
	case "get_customer_profile":
		return uc.toolGetCustomerProfile(ctx, botID, userID, inputJSON)
	case "get_customer_consent":
		return uc.toolGetCustomerConsent(ctx, botID, userID, inputJSON)
	case "get_customer_availability":
		return uc.toolGetCustomerAvailability(ctx, botID, userID, inputJSON)
	case "evaluate_policy":
		return uc.toolEvaluatePolicy(ctx, botID, spID, userID, inputJSON)
	case "get_conversation_summary":
		return uc.toolGetConversationSummary(ctx, botID, conversationID, userID, inputJSON)
	case "send_notification":
		return uc.toolSendNotification(ctx, botID, spID, userID, inputJSON)
	case "send_message":
		return uc.toolSendMessage(ctx, botID, conversationID, inputJSON)
	case "request_callback":
		return uc.toolRequestCallback(ctx, botID, spID, userID, inputJSON)
	case "share_document":
		return uc.toolShareDocument(ctx, botID, spID, conversationID, userID, inputJSON)
	case "escalate_to_human":
		return uc.toolEscalateToHuman(ctx, botID, conversationID, userID, inputJSON)
	default:
		return "", bizerr.InvalidInput("unknown tool: " + toolName)
	}
}

// ─── get_customer_profile ─────────────────────────────────────────────────
// Input:  { "user_id": "..." }   (defaults to the conversation's userID)
// Output: user profile fields

func (uc *BotUseCase) toolGetCustomerProfile(ctx context.Context, botID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.GetCustomerProfile",
		attribute.String("bot_id", botID),
		attribute.String("user_id", userID),
	)
	defer span.End()

	if uc.userClient == nil {
		return "", bizerr.Internal("user service not configured", nil)
	}

	var input struct {
		UserID string `json:"user_id"`
	}
	_ = json.Unmarshal([]byte(inputJSON), &input)
	targetUserID := input.UserID
	if targetUserID == "" {
		targetUserID = userID
	}

	resp, err := uc.userClient.GetUserProfile(ctx, &userv1.GetUserProfileRequest{UserId: targetUserID})
	if err != nil {
		return "", bizerr.Internal("get_customer_profile: user service error", err)
	}

	out, _ := json.Marshal(map[string]interface{}{
		"user_id":           resp.GetUserId(),
		"full_name":         resp.GetFullName(),
		"username":          resp.GetUsername(),
		"virtual_public_id": resp.GetVirtualPublicId(),
		"avatar_url":        resp.GetAvatarUrl(),
		"timezone":          resp.GetTimezone(),
		"language":          resp.GetLanguage(),
		"status":            resp.GetStatus(),
	})
	return string(out), nil
}

// ─── get_customer_consent ─────────────────────────────────────────────────
// Input:  { "user_id": "..." }
// Output: privacy preference flags

func (uc *BotUseCase) toolGetCustomerConsent(ctx context.Context, botID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.GetCustomerConsent",
		attribute.String("bot_id", botID),
		attribute.String("user_id", userID),
	)
	defer span.End()

	if uc.userClient == nil {
		return "", bizerr.Internal("user service not configured", nil)
	}

	var input struct {
		UserID string `json:"user_id"`
	}
	_ = json.Unmarshal([]byte(inputJSON), &input)
	targetUserID := input.UserID
	if targetUserID == "" {
		targetUserID = userID
	}

	pref, err := uc.userClient.GetPrivacyPreference(ctx, &userv1.GetPrivacyPreferenceRequest{UserId: targetUserID})
	if err != nil {
		return "", bizerr.Internal("get_customer_consent: user service error", err)
	}

	out, _ := json.Marshal(map[string]interface{}{
		"allow_personal_notifications": pref.GetAllowPersonalNotifications(),
		"allow_sp_notifications":       pref.GetAllowSpNotifications(),
		"allow_advertisements":         pref.GetAllowAdvertisements(),
		"allow_callback_requests":      pref.GetAllowCallbackRequests(),
		"allow_chat":                   pref.GetAllowChat(),
		"allow_document_shares":        pref.GetAllowDocumentShares(),
		"require_call_approval":        pref.GetRequireCallApproval(),
	})
	return string(out), nil
}

// ─── get_customer_availability ────────────────────────────────────────────
// Input:  { "user_id": "..." }
// Output: availability slots + active DND rules

func (uc *BotUseCase) toolGetCustomerAvailability(ctx context.Context, botID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.GetCustomerAvailability",
		attribute.String("bot_id", botID),
		attribute.String("user_id", userID),
	)
	defer span.End()

	if uc.userClient == nil {
		return "", bizerr.Internal("user service not configured", nil)
	}

	var input struct {
		UserID string `json:"user_id"`
	}
	_ = json.Unmarshal([]byte(inputJSON), &input)
	targetUserID := input.UserID
	if targetUserID == "" {
		targetUserID = userID
	}

	slotsResp, err := uc.userClient.ListAvailabilitySlots(ctx, &userv1.ListAvailabilitySlotsRequest{UserId: targetUserID})
	if err != nil {
		return "", bizerr.Internal("get_customer_availability: user service error", err)
	}

	dndResp, err := uc.userClient.ListDNDRules(ctx, &userv1.ListDNDRulesRequest{UserId: targetUserID})
	if err != nil {
		return "", bizerr.Internal("get_customer_availability: dnd rules error", err)
	}

	type slotOut struct {
		DayOfWeek int    `json:"day_of_week"`
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
		SlotType  string `json:"slot_type"`
		IsActive  bool   `json:"is_active"`
	}
	var slots []slotOut
	for _, s := range slotsResp.GetSlots() {
		slots = append(slots, slotOut{
			DayOfWeek: int(s.GetDayOfWeek()),
			StartTime: s.GetStartTime(),
			EndTime:   s.GetEndTime(),
			SlotType:  s.GetSlotType(),
			IsActive:  s.GetIsActive(),
		})
	}

	type dndOut struct {
		ScopeType string `json:"scope_type"`
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
		IsActive  bool   `json:"is_active"`
	}
	var dndRules []dndOut
	for _, d := range dndResp.GetRules() {
		if d.GetIsActive() {
			dndRules = append(dndRules, dndOut{
				ScopeType: d.GetScopeType(),
				StartTime: d.GetStartTime(),
				EndTime:   d.GetEndTime(),
				IsActive:  true,
			})
		}
	}

	out, _ := json.Marshal(map[string]interface{}{
		"availability_slots": slots,
		"dnd_rules":          dndRules,
	})
	return string(out), nil
}

// ─── evaluate_policy ──────────────────────────────────────────────────────
// Input:  { "category": "SERVICE_PROVIDER", "channel": "CHAT", "communication_type": "CHAT_MESSAGE" }
// Output: { "allowed": true/false, "reason": "...", "decision_code": "..." }

func (uc *BotUseCase) toolEvaluatePolicy(ctx context.Context, botID, spID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.EvaluatePolicy",
		attribute.String("bot_id", botID),
		attribute.String("user_id", userID),
	)
	defer span.End()

	if uc.policyClient == nil {
		return "", bizerr.Internal("policy service not configured", nil)
	}

	var input struct {
		Category          string `json:"category"`
		Channel           string `json:"channel"`
		CommunicationType string `json:"communication_type"`
	}
	_ = json.Unmarshal([]byte(inputJSON), &input)

	// Map string names to proto enum values with sensible defaults.
	catMap := map[string]policyv1.CommunicationCategory{
		"PERSONAL":         policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_PERSONAL,
		"SERVICE_PROVIDER": policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_SERVICE_PROVIDER,
		"ADVERTISEMENT":    policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_ADVERTISEMENT,
	}
	chanMap := map[string]policyv1.CommunicationChannel{
		"PUSH":     policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_PUSH,
		"INBOX":    policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_INBOX,
		"CHAT":     policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_CHAT,
		"CALLBACK": policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_CALLBACK,
		"DOCUMENT": policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_DOCUMENT,
	}
	typeMap := map[string]policyv1.CommunicationType{
		"NOTIFICATION":     policyv1.CommunicationType_COMMUNICATION_TYPE_NOTIFICATION,
		"CALLBACK_REQUEST": policyv1.CommunicationType_COMMUNICATION_TYPE_CALLBACK_REQUEST,
		"CHAT_MESSAGE":     policyv1.CommunicationType_COMMUNICATION_TYPE_CHAT_MESSAGE,
		"DOCUMENT_SHARE":   policyv1.CommunicationType_COMMUNICATION_TYPE_DOCUMENT_SHARE,
		"CAMPAIGN":         policyv1.CommunicationType_COMMUNICATION_TYPE_CAMPAIGN,
	}

	cat := catMap[strings.ToUpper(input.Category)]
	if cat == policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_UNSPECIFIED {
		cat = policyv1.CommunicationCategory_COMMUNICATION_CATEGORY_SERVICE_PROVIDER
	}
	ch := chanMap[strings.ToUpper(input.Channel)]
	if ch == policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_UNSPECIFIED {
		ch = policyv1.CommunicationChannel_COMMUNICATION_CHANNEL_CHAT
	}
	ct := typeMap[strings.ToUpper(input.CommunicationType)]
	if ct == policyv1.CommunicationType_COMMUNICATION_TYPE_UNSPECIFIED {
		ct = policyv1.CommunicationType_COMMUNICATION_TYPE_CHAT_MESSAGE
	}

	resp, err := uc.policyClient.EvaluateCommunication(ctx, &policyv1.EvaluateCommunicationRequest{
		UserId:            userID,
		ServiceProviderId: spID,
		Category:          cat,
		Channel:           ch,
		CommunicationType: ct,
	})
	if err != nil {
		return "", bizerr.Internal("evaluate_policy: policy service error", err)
	}

	out, _ := json.Marshal(map[string]interface{}{
		"allowed":       resp.GetAllowed(),
		"decision_code": resp.GetDecisionCode().String(),
		"reason":        resp.GetReason(),
		"applied_rules": resp.GetAppliedRules(),
	})
	return string(out), nil
}

// ─── get_conversation_summary ─────────────────────────────────────────────
// Input:  { "max_messages": 20 }
// Output: { "summary": "...", "message_count": N }
// Fetches the last N messages and summarises them via the AI service.

func (uc *BotUseCase) toolGetConversationSummary(ctx context.Context, botID, conversationID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.GetConversationSummary",
		attribute.String("bot_id", botID),
		attribute.String("conversation_id", conversationID),
	)
	defer span.End()

	if uc.commClient == nil {
		return "", bizerr.Internal("communication service not configured", nil)
	}

	var input struct {
		MaxMessages int32 `json:"max_messages"`
	}
	_ = json.Unmarshal([]byte(inputJSON), &input)
	if input.MaxMessages <= 0 || input.MaxMessages > 100 {
		input.MaxMessages = 20
	}

	msgsResp, err := uc.commClient.ListMessages(ctx, &communicationv1.ListMessagesRequest{
		ConversationId: conversationID,
		UserId:         userID,
		Limit:          input.MaxMessages,
		Offset:         0,
	})
	if err != nil {
		return "", bizerr.Internal("get_conversation_summary: list messages error", err)
	}

	if len(msgsResp.GetMessages()) == 0 {
		out, _ := json.Marshal(map[string]interface{}{
			"summary":       "No messages in this conversation yet.",
			"message_count": 0,
		})
		return string(out), nil
	}

	// Build a plain-text transcript for the summarise prompt.
	var sb strings.Builder
	for _, m := range msgsResp.GetMessages() {
		sb.WriteString(fmt.Sprintf("[%s]: %s\n", m.GetSenderType(), m.GetContent()))
	}

	// Ask AI to summarise — best-effort, fall back to transcript on failure.
	summary := sb.String()
	if uc.aiClient != nil {
		airesp, aiErr := uc.aiClient.ChatCompletion(ctx, &aiv1.ChatCompletionRequest{
			Provider:    "openai",
			Model:       "gpt-4o-mini",
			Temperature: 0.3,
			MaxTokens:   256,
			BotId:       botID,
			Messages: []*aiv1.ChatMessage{
				{Role: "system", Content: "Summarise the following conversation in 2-3 sentences. Be concise."},
				{Role: "user", Content: sb.String()},
			},
		})
		if aiErr == nil {
			summary = airesp.GetContent()
		} else {
			uc.log.Warn("get_conversation_summary: ai summarise failed, using raw transcript",
				zap.Error(aiErr),
				zap.String("bot_id", botID),
			)
		}
	}

	out, _ := json.Marshal(map[string]interface{}{
		"summary":       summary,
		"message_count": len(msgsResp.GetMessages()),
	})
	return string(out), nil
}

// ─── send_notification ────────────────────────────────────────────────────
// Input:  { "title": "...", "body": "...", "priority": "NORMAL", "category": "SERVICE_PROVIDER" }
// Output: { "notification_id": "...", "status": "..." }

func (uc *BotUseCase) toolSendNotification(ctx context.Context, botID, spID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.SendNotification",
		attribute.String("bot_id", botID),
		attribute.String("user_id", userID),
	)
	defer span.End()

	if uc.notifClient == nil {
		return "", bizerr.Internal("notification service not configured", nil)
	}

	var input struct {
		Title    string            `json:"title"`
		Body     string            `json:"body"`
		Priority string            `json:"priority"`
		Category string            `json:"category"`
		Metadata map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return "", bizerr.InvalidInput("send_notification: invalid input: " + err.Error())
	}
	if input.Title == "" {
		return "", bizerr.InvalidInput("send_notification: title is required")
	}
	if input.Priority == "" {
		input.Priority = "NORMAL"
	}
	if input.Category == "" {
		input.Category = "SERVICE_PROVIDER"
	}
	if input.Metadata == nil {
		input.Metadata = map[string]string{}
	}
	input.Metadata["sent_by_bot_id"] = botID

	resp, err := uc.notifClient.CreateNotification(ctx, &notificationv1.CreateNotificationRequest{
		UserId:            userID,
		ServiceProviderId: spID,
		Category:          input.Category,
		Title:             input.Title,
		Body:              input.Body,
		Priority:          input.Priority,
		Metadata:          input.Metadata,
	})
	if err != nil {
		return "", bizerr.Internal("send_notification: notification service error", err)
	}

	out, _ := json.Marshal(map[string]interface{}{
		"notification_id":  resp.GetNotificationId(),
		"status":           resp.GetStatus(),
		"rejection_reason": resp.GetRejectionReason(),
	})
	return string(out), nil
}

// ─── send_message ─────────────────────────────────────────────────────────
// Input:  { "content": "...", "message_type": "TEXT" }
// Output: { "message_id": "...", "conversation_id": "..." }

func (uc *BotUseCase) toolSendMessage(ctx context.Context, botID, conversationID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.SendMessage",
		attribute.String("bot_id", botID),
		attribute.String("conversation_id", conversationID),
	)
	defer span.End()

	if uc.commClient == nil {
		return "", bizerr.Internal("communication service not configured", nil)
	}

	var input struct {
		Content     string            `json:"content"`
		MessageType string            `json:"message_type"`
		Metadata    map[string]string `json:"metadata"`
	}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return "", bizerr.InvalidInput("send_message: invalid input: " + err.Error())
	}
	if input.Content == "" {
		return "", bizerr.InvalidInput("send_message: content is required")
	}
	if input.MessageType == "" {
		input.MessageType = "TEXT"
	}
	if input.Metadata == nil {
		input.Metadata = map[string]string{}
	}
	input.Metadata["sent_by_bot_id"] = botID

	msg, err := uc.commClient.SendMessage(ctx, &communicationv1.SendMessageRequest{
		ConversationId: conversationID,
		SenderType:     "AI",
		SenderRefId:    botID,
		MessageType:    input.MessageType,
		Content:        input.Content,
		Metadata:       input.Metadata,
	})
	if err != nil {
		return "", bizerr.Internal("send_message: communication service error", err)
	}

	out, _ := json.Marshal(map[string]interface{}{
		"message_id":      msg.GetId(),
		"conversation_id": msg.GetConversationId(),
	})
	return string(out), nil
}

// ─── request_callback ─────────────────────────────────────────────────────
// Input:  { "reason": "...", "details": "...", "sp_user_id": "..." }
// Output: { "callback_request_id": "...", "status": "...", "rejection_reason": "..." }

func (uc *BotUseCase) toolRequestCallback(ctx context.Context, botID, spID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.RequestCallback",
		attribute.String("bot_id", botID),
		attribute.String("user_id", userID),
	)
	defer span.End()

	if uc.commClient == nil {
		return "", bizerr.Internal("communication service not configured", nil)
	}

	var input struct {
		Reason   string `json:"reason"`
		Details  string `json:"details"`
		SPUserID string `json:"sp_user_id"`
	}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return "", bizerr.InvalidInput("request_callback: invalid input: " + err.Error())
	}
	if input.Reason == "" {
		return "", bizerr.InvalidInput("request_callback: reason is required")
	}
	if input.SPUserID == "" {
		// Use bot ID as requester reference when no specific agent specified.
		input.SPUserID = botID
	}

	resp, err := uc.commClient.CreateCallbackRequest(ctx, &communicationv1.CreateCallbackRequestRequest{
		UserId:              userID,
		ServiceProviderId:   spID,
		RequestedBySpUserId: input.SPUserID,
		Reason:              input.Reason,
		Details:             input.Details,
	})
	if err != nil {
		return "", bizerr.Internal("request_callback: communication service error", err)
	}

	out, _ := json.Marshal(map[string]interface{}{
		"callback_request_id": resp.GetCallbackRequestId(),
		"status":              resp.GetStatus(),
		"rejection_reason":    resp.GetRejectionReason(),
	})
	return string(out), nil
}

// ─── share_document ───────────────────────────────────────────────────────
// Input:  { "document_id": "...", "share_context": "CHAT" }
// Output: { "document_share_id": "...", "presigned_url": "...", "expires_at": "..." }

func (uc *BotUseCase) toolShareDocument(ctx context.Context, botID, spID, conversationID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.ShareDocument",
		attribute.String("bot_id", botID),
		attribute.String("user_id", userID),
	)
	defer span.End()

	if uc.commClient == nil {
		return "", bizerr.Internal("communication service not configured", nil)
	}
	if uc.docClient == nil {
		return "", bizerr.Internal("document service not configured", nil)
	}

	var input struct {
		DocumentID   string `json:"document_id"`
		ShareContext string `json:"share_context"`
		ExpiryMins   int32  `json:"expiry_minutes"`
	}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return "", bizerr.InvalidInput("share_document: invalid input: " + err.Error())
	}
	if input.DocumentID == "" {
		return "", bizerr.InvalidInput("share_document: document_id is required")
	}
	if input.ShareContext == "" {
		input.ShareContext = "CHAT"
	}
	if input.ExpiryMins <= 0 || input.ExpiryMins > 60 {
		input.ExpiryMins = 30
	}

	// Share the document via communication-service (records the share).
	shareResp, err := uc.commClient.ShareDocument(ctx, &communicationv1.ShareDocumentRequest{
		DocumentId:        input.DocumentID,
		UserId:            userID,
		ServiceProviderId: spID,
		ShareContext:      input.ShareContext,
	})
	if err != nil {
		return "", bizerr.Internal("share_document: communication service error", err)
	}

	// Generate presigned URL via document-service.
	urlResp, err := uc.docClient.GeneratePresignedURL(ctx, &documentv1.GeneratePresignedURLRequest{
		DocumentId:        input.DocumentID,
		ServiceProviderId: spID,
		ExpiryMinutes:     input.ExpiryMins,
	})
	if err != nil {
		// Non-fatal: return share ID without URL.
		out, _ := json.Marshal(map[string]interface{}{
			"document_share_id": shareResp.GetDocumentShareId(),
			"presigned_url":     "",
			"expires_at":        "",
		})
		return string(out), nil
	}

	expiresAt := ""
	if urlResp.GetExpiresAt() != nil {
		expiresAt = urlResp.GetExpiresAt().AsTime().Format("2006-01-02T15:04:05Z")
	}

	out, _ := json.Marshal(map[string]interface{}{
		"document_share_id": shareResp.GetDocumentShareId(),
		"presigned_url":     urlResp.GetUrl(),
		"expires_at":        expiresAt,
	})
	return string(out), nil
}

// ─── escalate_to_human ────────────────────────────────────────────────────
// Input:  { "reason": "...", "notes": "..." }
// Output: { "escalated": true, "reason": "..." }
// Sends a SYSTEM message in the conversation to flag human handoff,
// then returns an escalation signal so the caller can mark the bot turn complete.

func (uc *BotUseCase) toolEscalateToHuman(ctx context.Context, botID, conversationID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.EscalateToHuman",
		attribute.String("bot_id", botID),
		attribute.String("conversation_id", conversationID),
	)
	defer span.End()

	if uc.commClient == nil {
		return "", bizerr.Internal("communication service not configured", nil)
	}

	var input struct {
		Reason string `json:"reason"`
		Notes  string `json:"notes"`
	}
	_ = json.Unmarshal([]byte(inputJSON), &input)
	if input.Reason == "" {
		input.Reason = "Escalated by bot"
	}

	notice := fmt.Sprintf("🤝 This conversation has been escalated to a human agent. Reason: %s", input.Reason)
	if input.Notes != "" {
		notice += fmt.Sprintf(" | Notes: %s", input.Notes)
	}

	_, err := uc.commClient.SendMessage(ctx, &communicationv1.SendMessageRequest{
		ConversationId: conversationID,
		SenderType:     "SYSTEM",
		SenderRefId:    botID,
		MessageType:    "SYSTEM",
		Content:        notice,
		Metadata: map[string]string{
			"escalation_reason": input.Reason,
			"escalated_by_bot":  botID,
		},
	})
	if err != nil {
		uc.log.Warn("escalate_to_human: system message failed",
			zap.Error(err),
			zap.String("bot_id", botID),
			zap.String("conversation_id", conversationID),
		)
	}

	out, _ := json.Marshal(map[string]interface{}{
		"escalated": true,
		"reason":    input.Reason,
	})
	return string(out), nil
}
