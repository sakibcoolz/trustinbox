package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/bot-service/internal/domain/entity"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/cornerstone/pii"
	"github.com/trustinbox/cornerstone/tracing"
	aiv1 "github.com/trustinbox/proto/gen/ai/v1"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

// ─── Agent Suite Provisioning ─────────────────────────────────────────────

// agentSuiteDefinitions describes each sub-agent to create when provisioning.
var agentSuiteDefinitions = []struct {
	AgentType  entity.AgentType
	Name       string
	Purpose    string
	Department string
}{
	{entity.AgentTypeDocumentationWriter, "Documentation Writer", "Handles document generation, sharing, and knowledge base queries.", "Documentation"},
	{entity.AgentTypeCustomerService, "Customer Service Agent", "Resolves customer inquiries, collects consent, and escalates complex issues.", "Support"},
	{entity.AgentTypeAppointmentScheduling, "Appointment Scheduler", "Checks availability and schedules callbacks or appointments.", "Scheduling"},
	{entity.AgentTypePayment, "Payment Agent", "Assists with payment flows and policy verification for financial transactions.", "Finance"},
	{entity.AgentTypeOrderAccepting, "Order Agent", "Receives and confirms orders from customers.", "Operations"},
	{entity.AgentTypeProductShowcase, "Product Showcase Agent", "Presents products, shares catalogs, and summarises offerings.", "Sales"},
}

// ProvisionAgentSuite creates the Manager bot plus all specialized sub-agents for a service provider.
// Idempotent: if a suite already exists for the SP it is returned as-is.
func (uc *BotUseCase) ProvisionAgentSuite(ctx context.Context, spID, createdByUserID string) (*entity.AgentSuite, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ProvisionAgentSuite",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	if spID == "" {
		return nil, bizerr.InvalidInput("service_provider_id is required")
	}

	// Return existing suite if already provisioned
	existing, err := uc.agentSuiteRepo.GetBySP(ctx, spID)
	if err == nil {
		return uc.hydrateAgentSuite(ctx, existing)
	}
	if !bizerr.IsNotFound(err) {
		return nil, bizerr.Internal("failed to check agent suite", err)
	}

	now := time.Now().UTC()

	// Create the Manager bot
	managerBot := &entity.Bot{
		ID:                uuid.New().String(),
		ServiceProviderID: spID,
		Name:              "Manager Agent",
		Purpose:           "Orchestrates all specialized sub-agents. Classifies user intent and delegates to the correct agent.",
		Department:        "Management",
		Status:            entity.BotStatusActive,
		CreatedBySPUserID: createdByUserID,
		AgentType:         entity.AgentTypeManager,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := uc.botRepo.Create(ctx, managerBot); err != nil {
		return nil, bizerr.Internal("failed to create manager bot", err)
	}
	if err := uc.provisionBotDefaults(ctx, managerBot); err != nil {
		return nil, err
	}

	// Create the AgentSuite record
	suite := &entity.AgentSuite{
		ID:                uuid.New().String(),
		ServiceProviderID: spID,
		ManagerBotID:      managerBot.ID,
		Status:            entity.AgentSuiteStatusActive,
		ProvisionedAt:     now,
		UpdatedAt:         now,
	}
	if err := uc.agentSuiteRepo.Create(ctx, suite); err != nil {
		return nil, bizerr.Internal("failed to create agent suite", err)
	}

	// Create sub-agents
	for _, def := range agentSuiteDefinitions {
		subBot := &entity.Bot{
			ID:                uuid.New().String(),
			ServiceProviderID: spID,
			Name:              def.Name,
			Purpose:           def.Purpose,
			Department:        def.Department,
			Status:            entity.BotStatusActive,
			CreatedBySPUserID: createdByUserID,
			AgentType:         def.AgentType,
			ManagerBotID:      managerBot.ID,
			CreatedAt:         now,
			UpdatedAt:         now,
		}
		if err := uc.botRepo.Create(ctx, subBot); err != nil {
			return nil, bizerr.Internal(fmt.Sprintf("failed to create %s bot", def.AgentType), err)
		}
		if err := uc.provisionBotDefaults(ctx, subBot); err != nil {
			return nil, err
		}
	}

	uc.log.Info("agent suite provisioned",
		zap.String("service_provider_id", spID),
		zap.String("manager_bot_id", managerBot.ID),
		zap.String("suite_id", suite.ID),
	)

	uc.publishEvent(ctx, events.AgentSuiteProvisioned, suite.ID, "", spID, map[string]string{
		"suite_id":       suite.ID,
		"manager_bot_id": managerBot.ID,
	})

	return uc.hydrateAgentSuite(ctx, suite)
}

// provisionBotDefaults creates default config + default tool permissions for an agent.
func (uc *BotUseCase) provisionBotDefaults(ctx context.Context, bot *entity.Bot) error {
	config := &entity.BotConfiguration{
		BotID:                    bot.ID,
		Tone:                     "professional",
		WritingStyle:             "concise",
		SupportedLanguages:       []string{"en"},
		WorkingDays:              []int{1, 2, 3, 4, 5},
		MaxTurnsBeforeEscalation: 10,
		Temperature:              0.7,
		AIModel:                  "gpt-4o-mini",
		MaxResponseTokens:        1024,
	}
	if err := uc.configRepo.Upsert(ctx, config); err != nil {
		return bizerr.Internal("failed to create bot config", err)
	}

	for _, tool := range entity.DefaultToolsForAgentType(bot.AgentType) {
		perm := &entity.BotPermission{
			ID:        uuid.New().String(),
			BotID:     bot.ID,
			ToolName:  tool,
			IsAllowed: true,
		}
		if err := uc.permRepo.Set(ctx, perm); err != nil {
			return bizerr.Internal("failed to set bot permission", err)
		}
	}
	return nil
}

// hydrateAgentSuite loads Manager + sub-agents into the suite struct.
func (uc *BotUseCase) hydrateAgentSuite(ctx context.Context, suite *entity.AgentSuite) (*entity.AgentSuite, error) {
	manager, err := uc.botRepo.GetByID(ctx, suite.ManagerBotID)
	if err != nil {
		return nil, bizerr.Internal("failed to load manager bot", err)
	}
	agents, err := uc.botRepo.ListByManager(ctx, suite.ManagerBotID)
	if err != nil {
		return nil, bizerr.Internal("failed to load sub-agents", err)
	}
	suite.Manager = manager
	suite.Agents = agents
	return suite, nil
}

// GetAgentSuite returns the agent suite for a service provider.
func (uc *BotUseCase) GetAgentSuite(ctx context.Context, spID string) (*entity.AgentSuite, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.GetAgentSuite",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	suite, err := uc.agentSuiteRepo.GetBySP(ctx, spID)
	if err != nil {
		return nil, err
	}
	return uc.hydrateAgentSuite(ctx, suite)
}

// ─── Agent Delegation ─────────────────────────────────────────────────────

// DelegateInput is the input to DelegateToAgent.
type DelegateInput struct {
	ManagerBotID   string
	SPID           string
	UserID         string
	ConversationID string
	AgentType      string
	TaskInput      string
	ActionType     string
	// ThreadID groups related delegation hops. Generated on first call if empty.
	ThreadID string
	// DelegationDepth tracks how many delegation hops have occurred (0-based).
	DelegationDepth int
}

// DelegateOutput is the result of DelegateToAgent.
type DelegateOutput struct {
	Success         bool
	OutputJSON      string
	PolicyDecision  string
	PolicyReason    string
	Escalated       bool
	DurationMS      int
	IntentDetected  string
	ConfidenceScore float64
}

// DelegateToAgent routes a task from the Manager to a specific sub-agent.
func (uc *BotUseCase) DelegateToAgent(ctx context.Context, in DelegateInput) (*DelegateOutput, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.DelegateToAgent",
		attribute.String("manager_bot_id", in.ManagerBotID),
		attribute.String("service_provider_id", in.SPID),
		attribute.String("agent_type", in.AgentType),
	)
	defer span.End()

	const maxDelegationDepth = 3
	if in.DelegationDepth >= maxDelegationDepth {
		return nil, bizerr.InvalidInput(fmt.Sprintf("max delegation depth of %d exceeded", maxDelegationDepth))
	}

	// Ensure every chain of delegations shares a single ThreadID.
	threadID := in.ThreadID
	if threadID == "" {
		threadID = uuid.New().String()
	}

	start := time.Now()

	// Find the target sub-agent
	subAgents, err := uc.botRepo.ListByManager(ctx, in.ManagerBotID)
	if err != nil {
		return nil, bizerr.Internal("failed to load sub-agents", err)
	}

	var targetBot *entity.Bot
	for _, a := range subAgents {
		if string(a.AgentType) == in.AgentType {
			targetBot = a
			break
		}
	}
	if targetBot == nil {
		return nil, bizerr.NotFound("sub-agent", in.AgentType)
	}

	// Use AI to detect intent for the delegation log
	intentDetected := in.AgentType
	var confidenceScore float64 = 1.0
	if uc.aiClient != nil && in.TaskInput != "" {
		aiResp, aiErr := uc.aiClient.CategorizeMessage(ctx, &aiv1.CategorizeMessageRequest{
			Content:    in.TaskInput,
			SenderId:   in.UserID,
			SenderType: "USER",
			ContextMetadata: map[string]string{
				"agent_type": in.AgentType,
				"bot_id":     in.ManagerBotID,
			},
		})
		if aiErr == nil && aiResp != nil && aiResp.PrimaryCategory != nil {
			confidenceScore = aiResp.PrimaryCategory.Confidence
		}
	}

	// Execute the bot action on the target sub-agent
	inputData, _ := json.Marshal(map[string]string{
		"task_input":   in.TaskInput,
		"delegated_by": in.ManagerBotID,
	})

	outputJSON, execErr := uc.dispatchTool(ctx, targetBot.ID, in.SPID, in.ConversationID, in.UserID, in.ActionType, string(inputData))

	durationMS := int(time.Since(start).Milliseconds())
	success := execErr == nil
	errMsg := ""
	policyDecision := "ALLOWED"
	policyReason := ""
	escalated := false

	if execErr != nil {
		errMsg = execErr.Error()
		if bizerr.IsPolicyDenied(execErr) {
			policyDecision = "DENIED"
			policyReason = errMsg
		}
	}

	// Record delegation log
	delegScanner := pii.New()
	redactedInput, _ := delegScanner.Redact(in.TaskInput)
	redactedOutput, _ := delegScanner.Redact(outputJSON)
	logEntry := &entity.AgentDelegationLog{
		ID:                uuid.New().String(),
		ManagerBotID:      in.ManagerBotID,
		TargetBotID:       targetBot.ID,
		UserID:            in.UserID,
		ConversationID:    in.ConversationID,
		ServiceProviderID: in.SPID,
		ThreadID:          threadID,
		DelegationDepth:   in.DelegationDepth,
		IntentDetected:    intentDetected,
		ConfidenceScore:   confidenceScore,
		InputSummary:      pii.Truncate(redactedInput, 500),
		OutputSummary:     pii.Truncate(redactedOutput, 500),
		DurationMS:        durationMS,
		Success:           success,
		ErrorMessage:      errMsg,
		CreatedAt:         time.Now().UTC(),
	}
	if logErr := uc.delegationRepo.Create(ctx, logEntry); logErr != nil {
		uc.log.Error("failed to create delegation log", zap.Error(logErr))
	}

	uc.publishEvent(ctx, events.AgentDelegated, logEntry.ID, in.UserID, in.SPID, map[string]interface{}{
		"manager_bot_id":  in.ManagerBotID,
		"target_bot_id":   targetBot.ID,
		"intent_detected": intentDetected,
		"success":         success,
	})

	return &DelegateOutput{
		Success:         success,
		OutputJSON:      outputJSON,
		PolicyDecision:  policyDecision,
		PolicyReason:    policyReason,
		Escalated:       escalated,
		DurationMS:      durationMS,
		IntentDetected:  intentDetected,
		ConfidenceScore: confidenceScore,
	}, execErr
}

// ListDelegationLogs returns delegation logs for a manager bot.
func (uc *BotUseCase) ListDelegationLogs(ctx context.Context, managerBotID, spID string, limit, offset int) ([]*entity.AgentDelegationLog, int, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ListDelegationLogs",
		attribute.String("manager_bot_id", managerBotID),
	)
	defer span.End()

	// Verify manager bot belongs to this SP
	bot, err := uc.botRepo.GetByID(ctx, managerBotID)
	if err != nil {
		return nil, 0, err
	}
	if bot.ServiceProviderID != spID {
		return nil, 0, bizerr.Forbidden("bot does not belong to this service provider")
	}

	return uc.delegationRepo.ListByManager(ctx, managerBotID, limit, offset)
}

// ─── delegate_to_agent tool ───────────────────────────────────────────────

// toolDelegateToAgent implements the delegate_to_agent tool dispatch.
func (uc *BotUseCase) toolDelegateToAgent(ctx context.Context, botID, spID, conversationID, userID, inputJSON string) (string, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "tool.DelegateToAgent",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	var input struct {
		AgentType  string `json:"agent_type"`
		TaskInput  string `json:"task_input"`
		ActionType string `json:"action_type"`
	}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return "", bizerr.InvalidInput("invalid delegate_to_agent input")
	}
	if input.AgentType == "" {
		return "", bizerr.InvalidInput("agent_type is required for delegation")
	}
	if input.ActionType == "" {
		input.ActionType = "send_message"
	}

	out, err := uc.DelegateToAgent(ctx, DelegateInput{
		ManagerBotID:   botID,
		SPID:           spID,
		UserID:         userID,
		ConversationID: conversationID,
		AgentType:      input.AgentType,
		TaskInput:      input.TaskInput,
		ActionType:     input.ActionType,
	})
	if err != nil {
		return "", err
	}

	result, _ := json.Marshal(out)
	return string(result), nil
}
