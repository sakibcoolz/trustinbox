package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/bot-service/internal/domain/entity"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

// ─── Workflow configuration CRUD ─────────────────────────────────────────────

// CreateWorkflowConfig registers an n8n workflow that a bot can trigger.
func (uc *BotUseCase) CreateWorkflowConfig(
	ctx context.Context,
	botID, spID, workflowID, workflowName, webhookPath, description string,
	isActive bool,
) (*entity.BotWorkflowConfig, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.CreateWorkflowConfig",
		attribute.String("bot_id", botID),
		attribute.String("workflow_id", workflowID),
	)
	defer span.End()

	if uc.workflowRepo == nil {
		return nil, bizerr.Internal("workflow repository not configured", nil)
	}
	if workflowID == "" {
		return nil, bizerr.InvalidInput("workflow_id is required")
	}
	if workflowName == "" {
		return nil, bizerr.InvalidInput("workflow_name is required")
	}
	if webhookPath == "" || !strings.HasPrefix(webhookPath, "/") {
		return nil, bizerr.InvalidInput("webhook_path must start with '/'")
	}

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}

	cfg := &entity.BotWorkflowConfig{
		ID:           uuid.New().String(),
		BotID:        botID,
		WorkflowID:   workflowID,
		WorkflowName: workflowName,
		WebhookPath:  webhookPath,
		Description:  description,
		IsActive:     isActive,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	if err := uc.workflowRepo.Create(ctx, cfg); err != nil {
		return nil, bizerr.Internal("failed to create workflow config", err)
	}
	return cfg, nil
}

// ListWorkflowConfigs returns the workflows registered for a bot.
func (uc *BotUseCase) ListWorkflowConfigs(ctx context.Context, botID, spID string) ([]*entity.BotWorkflowConfig, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ListWorkflowConfigs",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	if uc.workflowRepo == nil {
		return nil, bizerr.Internal("workflow repository not configured", nil)
	}
	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}
	return uc.workflowRepo.ListByBot(ctx, botID)
}

// DeleteWorkflowConfig removes a registered workflow.
func (uc *BotUseCase) DeleteWorkflowConfig(ctx context.Context, configID, botID, spID string) error {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.DeleteWorkflowConfig",
		attribute.String("bot_id", botID),
		attribute.String("config_id", configID),
	)
	defer span.End()

	if uc.workflowRepo == nil {
		return bizerr.Internal("workflow repository not configured", nil)
	}
	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return err
	}
	if bot.ServiceProviderID != spID {
		return bizerr.Forbidden("bot does not belong to this service provider")
	}
	cfg, err := uc.workflowRepo.GetByID(ctx, configID)
	if err != nil {
		return err
	}
	if cfg.BotID != botID {
		return bizerr.Forbidden("workflow config does not belong to this bot")
	}
	return uc.workflowRepo.Delete(ctx, configID)
}

// ─── Workflow dispatch (called by ExecuteAction tool=execute_workflow) ───────

// dispatchWorkflowTool triggers an n8n workflow. The input JSON shape:
//
//	{
//	  "workflow_id": "crm-lookup",
//	  "input_data": { ... },
//	  "async": false
//	}
//
// Returns (outputJSON, suspended, err). When suspended is true the bot turn
// must wait for the resume callback to deliver the result.
func (uc *BotUseCase) dispatchWorkflowTool(
	ctx context.Context,
	botID, spID, conversationID, userID, inputJSON string,
) (string, bool, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.dispatchWorkflowTool",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	if uc.workflows == nil || uc.workflowRepo == nil {
		return "", false, bizerr.Internal("workflow dispatcher not configured", nil)
	}

	var input struct {
		WorkflowID string          `json:"workflow_id"`
		InputData  json.RawMessage `json:"input_data"`
		Async      bool            `json:"async"`
	}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return "", false, bizerr.InvalidInput("invalid execute_workflow input: " + err.Error())
	}
	if input.WorkflowID == "" {
		return "", false, bizerr.InvalidInput("workflow_id is required")
	}

	cfg, err := uc.workflowRepo.GetByWorkflowID(ctx, botID, input.WorkflowID)
	if err != nil {
		return "", false, err
	}
	if !cfg.IsActive {
		return "", false, bizerr.InvalidInput("workflow is not active: " + input.WorkflowID)
	}

	// For async, generate a one-time resume token and persist a suspension row.
	var resumeURL string
	if input.Async {
		if uc.suspensionRepo == nil {
			return "", false, bizerr.Internal("workflow suspension repository not configured", nil)
		}
		token, err := generateResumeToken()
		if err != nil {
			return "", false, bizerr.Internal("failed to generate resume token", err)
		}
		susp := &entity.BotWorkflowSuspension{
			ID:             uuid.New().String(),
			ResumeToken:    token,
			BotID:          botID,
			ConversationID: conversationID,
			UserID:         userID,
			WorkflowID:     input.WorkflowID,
			CreatedAt:      time.Now().UTC(),
			ExpiresAt:      time.Now().UTC().Add(15 * time.Minute),
		}
		if err := uc.suspensionRepo.Create(ctx, susp); err != nil {
			return "", false, bizerr.Internal("failed to persist suspension", err)
		}
		if uc.resumeBaseURL != "" {
			resumeURL = strings.TrimRight(uc.resumeBaseURL, "/") + "/api/v1/workflows/resume/" + token
		}
	}

	out, err := uc.workflows.Trigger(ctx, cfg.WebhookPath, &WorkflowTriggerInput{
		WorkflowID:        input.WorkflowID,
		BotID:             botID,
		ServiceProviderID: spID,
		ConversationID:    conversationID,
		UserID:            userID,
		ResumeCallbackURL: resumeURL,
		InputDataJSON:     input.InputData,
	})
	if err != nil {
		uc.log.Error("workflow trigger failed",
			zap.String("workflow_id", input.WorkflowID),
			zap.String("bot_id", botID),
			zap.Error(err),
		)
		return "", false, bizerr.Internal("workflow trigger failed", err)
	}

	uc.publishEvent(ctx, events.BotActionExecuted, botID, userID, spID, map[string]interface{}{
		"bot_id":          botID,
		"conversation_id": conversationID,
		"user_id":         userID,
		"tool_name":       "execute_workflow",
		"workflow_id":     input.WorkflowID,
		"async":           input.Async,
	})

	if input.Async {
		result, _ := json.Marshal(map[string]interface{}{
			"status":      "suspended",
			"workflow_id": input.WorkflowID,
			"resume_url":  resumeURL,
		})
		return string(result), true, nil
	}

	result, _ := json.Marshal(map[string]interface{}{
		"status":      "executed",
		"workflow_id": input.WorkflowID,
		"success":     out.Success,
		"data":        out.Data,
	})
	return string(result), false, nil
}

// ResumeWorkflow is invoked by the gateway when n8n posts back the result of an
// async workflow. It validates the token, marks the suspension as resumed, and
// publishes a bot.action.executed event so the conversation can resume.
func (uc *BotUseCase) ResumeWorkflow(ctx context.Context, resumeToken, resultJSON string) (*entity.BotWorkflowSuspension, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ResumeWorkflow")
	defer span.End()

	if uc.suspensionRepo == nil {
		return nil, bizerr.Internal("workflow suspension repository not configured", nil)
	}
	if resumeToken == "" {
		return nil, bizerr.InvalidInput("resume_token is required")
	}

	susp, err := uc.suspensionRepo.GetByResumeToken(ctx, resumeToken)
	if err != nil {
		return nil, err
	}
	if susp.Status != "PENDING" {
		return nil, bizerr.InvalidInput("workflow already resumed or expired")
	}
	if time.Now().After(susp.ExpiresAt) {
		return nil, bizerr.InvalidInput("resume token expired")
	}
	if err := uc.suspensionRepo.MarkResumed(ctx, resumeToken, resultJSON); err != nil {
		return nil, err
	}
	susp.ResultJSON = resultJSON
	susp.Status = "RESUMED"

	uc.publishEvent(ctx, events.BotActionExecuted, susp.BotID, susp.UserID, "", map[string]interface{}{
		"bot_id":          susp.BotID,
		"conversation_id": susp.ConversationID,
		"user_id":         susp.UserID,
		"tool_name":       "execute_workflow",
		"workflow_id":     susp.WorkflowID,
		"resumed":         true,
		"result":          json.RawMessage(resultJSON),
	})

	return susp, nil
}

// generateResumeToken returns a 32-byte hex-encoded random token.
func generateResumeToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
