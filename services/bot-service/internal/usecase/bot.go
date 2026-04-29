package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
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

// PolicyChecker evaluates whether a bot action is allowed.
type PolicyChecker interface {
	EvaluateBotAction(ctx context.Context, botID, userID, toolName string) (allowed bool, reason string, err error)
}

// WorkflowDispatcher triggers an n8n workflow via its webhook and returns the response.
// Implemented by services/bot-service/internal/infra/n8n.Client.
type WorkflowDispatcher interface {
	Trigger(ctx context.Context, webhookPath string, req *WorkflowTriggerInput) (*WorkflowTriggerOutput, error)
}

// WorkflowTriggerInput is the data passed to the workflow dispatcher.
type WorkflowTriggerInput struct {
	WorkflowID        string
	BotID             string
	ServiceProviderID string
	ConversationID    string
	UserID            string
	ResumeCallbackURL string
	InputDataJSON     json.RawMessage
}

// WorkflowTriggerOutput is the response returned by the dispatcher.
type WorkflowTriggerOutput struct {
	Success bool
	Data    json.RawMessage
	Error   string
}

// BotUseCase implements bot lifecycle and action operations.
type BotUseCase struct {
	botRepo        repository.BotRepository
	configRepo     repository.BotConfigurationRepository
	permRepo       repository.BotPermissionRepository
	sourceRepo     repository.KnowledgeSourceRepository
	actionRepo     repository.BotActionLogRepository
	statsRepo      repository.BotAnalyticsRepository
	workflowRepo   repository.BotWorkflowConfigRepository
	suspensionRepo repository.BotWorkflowSuspensionRepository
	policy         PolicyChecker
	aiClient       aiv1.AIServiceClient
	userClient     userv1.UserServiceClient
	notifClient    notificationv1.NotificationServiceClient
	commClient     communicationv1.CommunicationServiceClient
	policyClient   policyv1.PolicyServiceClient
	docClient      documentv1.DocumentServiceClient
	workflows      WorkflowDispatcher
	resumeBaseURL  string
	publisher      events.Publisher
	log            *zap.Logger
}

// NewBotUseCase creates a new BotUseCase.
func NewBotUseCase(
	botRepo repository.BotRepository,
	configRepo repository.BotConfigurationRepository,
	permRepo repository.BotPermissionRepository,
	sourceRepo repository.KnowledgeSourceRepository,
	actionRepo repository.BotActionLogRepository,
	statsRepo repository.BotAnalyticsRepository,
	workflowRepo repository.BotWorkflowConfigRepository,
	suspensionRepo repository.BotWorkflowSuspensionRepository,
	policy PolicyChecker,
	aiClient aiv1.AIServiceClient,
	userClient userv1.UserServiceClient,
	notifClient notificationv1.NotificationServiceClient,
	commClient communicationv1.CommunicationServiceClient,
	policyClient policyv1.PolicyServiceClient,
	docClient documentv1.DocumentServiceClient,
	workflows WorkflowDispatcher,
	resumeBaseURL string,
	publisher events.Publisher,
	log *zap.Logger,
) *BotUseCase {
	return &BotUseCase{
		botRepo:        botRepo,
		configRepo:     configRepo,
		permRepo:       permRepo,
		sourceRepo:     sourceRepo,
		actionRepo:     actionRepo,
		statsRepo:      statsRepo,
		workflowRepo:   workflowRepo,
		suspensionRepo: suspensionRepo,
		policy:         policy,
		aiClient:       aiClient,
		userClient:     userClient,
		notifClient:    notifClient,
		commClient:     commClient,
		policyClient:   policyClient,
		docClient:      docClient,
		workflows:      workflows,
		resumeBaseURL:  resumeBaseURL,
		publisher:      publisher,
		log:            log,
	}
}

// CreateBot creates a new bot for a service provider.
func (uc *BotUseCase) CreateBot(ctx context.Context, spID, name, purpose, department, industryProfileID, createdByUserID, avatarURL string) (*entity.Bot, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.CreateBot",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	if name == "" {
		return nil, bizerr.InvalidInput("bot name is required")
	}
	if purpose == "" {
		return nil, bizerr.InvalidInput("bot purpose is required")
	}

	bot := &entity.Bot{
		ID:                uuid.New().String(),
		ServiceProviderID: spID,
		Name:              name,
		AvatarURL:         avatarURL,
		Purpose:           purpose,
		Department:        department,
		IndustryProfileID: industryProfileID,
		Status:            entity.BotStatusDraft,
		CreatedBySPUserID: createdByUserID,
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}

	if err := uc.botRepo.Create(ctx, bot); err != nil {
		return nil, bizerr.Internal("failed to create bot", err)
	}

	// Create default configuration
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
		return nil, bizerr.Internal("failed to create bot configuration", err)
	}

	// Grant default tool permissions
	for _, tool := range entity.AllowedBotTools {
		perm := &entity.BotPermission{
			ID:        uuid.New().String(),
			BotID:     bot.ID,
			ToolName:  tool,
			IsAllowed: true,
		}
		if err := uc.permRepo.Set(ctx, perm); err != nil {
			return nil, bizerr.Internal("failed to set bot permission", err)
		}
	}

	// Publish bot.created event
	uc.publishEvent(ctx, events.BotCreated, bot.ID, createdByUserID, spID, map[string]interface{}{
		"bot_id":              bot.ID,
		"service_provider_id": spID,
		"name":                name,
		"purpose":             purpose,
	})

	return bot, nil
}

// GetBot retrieves a bot by ID.
func (uc *BotUseCase) GetBot(ctx context.Context, botID, spID string) (*entity.Bot, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.GetBot",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}
	return bot, nil
}

// UpdateBot updates a bot's basic fields.
func (uc *BotUseCase) UpdateBot(ctx context.Context, botID, spID, name, purpose, department, avatarURL, status string) (*entity.Bot, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.UpdateBot",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}

	if name != "" {
		bot.Name = name
	}
	if purpose != "" {
		bot.Purpose = purpose
	}
	if department != "" {
		bot.Department = department
	}
	if avatarURL != "" {
		bot.AvatarURL = avatarURL
	}
	if status != "" {
		bot.Status = entity.BotStatus(status)
	}
	bot.UpdatedAt = time.Now().UTC()

	if err := uc.botRepo.Update(ctx, bot); err != nil {
		return nil, bizerr.Internal("failed to update bot", err)
	}
	return bot, nil
}

// ListBots returns bots for a service provider.
func (uc *BotUseCase) ListBots(ctx context.Context, spID, status string, limit, offset int) ([]*entity.Bot, int, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ListBots",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	return uc.botRepo.ListBySP(ctx, spID, status, limit, offset)
}

// DeleteBot archives a bot (soft delete).
func (uc *BotUseCase) DeleteBot(ctx context.Context, botID, spID string) error {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.DeleteBot",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return err
	}
	if bot.ServiceProviderID != spID {
		return bizerr.Forbidden("bot does not belong to this service provider")
	}

	bot.Status = entity.BotStatusArchived
	bot.UpdatedAt = time.Now().UTC()
	return uc.botRepo.Update(ctx, bot)
}

// ExecuteAction executes a bot action with policy validation.
func (uc *BotUseCase) ExecuteAction(ctx context.Context, botID, spID, conversationID, userID, actionType, toolName, inputJSON string) (string, bool, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ExecuteAction",
		attribute.String("bot_id", botID),
		attribute.String("tool_name", toolName),
	)
	defer span.End()

	start := time.Now()

	// Verify bot exists and belongs to SP
	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return "", false, err
	}
	if bot.ServiceProviderID != spID {
		return "", false, bizerr.Forbidden("bot does not belong to this service provider")
	}

	// Handle test_prompt: call AI service directly, skip permission/policy/status checks
	// This allows testing draft bots in the wizard before they are published.
	if actionType == "test_prompt" {
		return uc.executeTestPrompt(ctx, bot, inputJSON, start)
	}

	if bot.Status != entity.BotStatusActive {
		return "", false, bizerr.InvalidInput("bot is not active")
	}

	// Check tool permission
	allowed, err := uc.permRepo.IsToolAllowed(ctx, botID, toolName)
	if err != nil {
		return "", false, bizerr.Internal("failed to check tool permission", err)
	}
	if !allowed {
		return "", false, bizerr.Forbidden("bot does not have permission to use tool: " + toolName)
	}

	// Evaluate policy
	policyAllowed, policyReason, err := uc.policy.EvaluateBotAction(ctx, botID, userID, toolName)
	if err != nil {
		return "", false, bizerr.Internal("policy evaluation failed", err)
	}

	actionLog := &entity.BotActionLog{
		ID:             uuid.New().String(),
		BotID:          botID,
		ConversationID: conversationID,
		UserID:         userID,
		ActionType:     actionType,
		ToolUsed:       toolName,
		InputSummary:   truncate(inputJSON, 500),
		PolicyDecision: "ALLOW",
		PolicyReason:   policyReason,
		DurationMS:     int(time.Since(start).Milliseconds()),
		Success:        true,
		CreatedAt:      time.Now().UTC(),
	}

	if !policyAllowed {
		actionLog.PolicyDecision = "DENY"
		actionLog.Success = false
		actionLog.ErrorMessage = "policy denied: " + policyReason
		uc.actionRepo.Create(ctx, actionLog)
		return "", false, bizerr.PolicyDenied(policyReason)
	}

	// Dispatch to the appropriate tool implementation.
	var outputJSON string
	switch toolName {
	case "execute_workflow":
		out, escalated, err := uc.dispatchWorkflowTool(ctx, botID, spID, conversationID, userID, inputJSON)
		if err != nil {
			actionLog.Success = false
			actionLog.ErrorMessage = err.Error()
			actionLog.DurationMS = int(time.Since(start).Milliseconds())
			uc.actionRepo.Create(ctx, actionLog)
			return "", false, err
		}
		outputJSON = out
		if escalated {
			// Workflow returned a suspension token — caller should pause the turn.
			actionLog.OutputSummary = truncate(outputJSON, 500)
			actionLog.DurationMS = int(time.Since(start).Milliseconds())
			uc.actionRepo.Create(ctx, actionLog)
			uc.statsRepo.IncrementActions(ctx, botID)
			return outputJSON, true, nil
		}
	default:
		var toolErr error
		outputJSON, toolErr = uc.dispatchTool(ctx, botID, spID, conversationID, userID, toolName, inputJSON)
		if toolErr != nil {
			actionLog.Success = false
			actionLog.ErrorMessage = toolErr.Error()
			actionLog.DurationMS = int(time.Since(start).Milliseconds())
			uc.actionRepo.Create(ctx, actionLog)
			return "", false, toolErr
		}
	}

	actionLog.OutputSummary = truncate(outputJSON, 500)
	actionLog.DurationMS = int(time.Since(start).Milliseconds())
	uc.actionRepo.Create(ctx, actionLog)

	// Update analytics
	uc.statsRepo.IncrementActions(ctx, botID)

	// Publish bot.action.executed event
	uc.publishEvent(ctx, events.BotActionExecuted, botID, userID, spID, map[string]interface{}{
		"bot_id":          botID,
		"conversation_id": conversationID,
		"user_id":         userID,
		"action_type":     actionType,
		"tool_name":       toolName,
		"duration_ms":     actionLog.DurationMS,
	})

	return outputJSON, false, nil
}

// executeTestPrompt handles test_prompt actions by calling the AI service directly.
// Input JSON shape: { "message": "...", "systemPrompt": "...", "history": [{"role":"user"|"assistant","content":"..."}] }
func (uc *BotUseCase) executeTestPrompt(ctx context.Context, bot *entity.Bot, inputJSON string, start time.Time) (string, bool, error) {
	if uc.aiClient == nil {
		return "", false, bizerr.Internal("ai service not configured", nil)
	}

	// ─── Parse input ────────────────────────────────────────────────────────
	var input struct {
		Message      string `json:"message"`
		SystemPrompt string `json:"systemPrompt"`
		History      []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"history"`
	}
	if err := json.Unmarshal([]byte(inputJSON), &input); err != nil {
		return "", false, bizerr.InvalidInput("invalid test_prompt input: " + err.Error())
	}

	// ─── Resolve system prompt ───────────────────────────────────────────────
	// Load bot configuration for model settings and custom system prompt.
	cfg, cfgErr := uc.configRepo.Get(ctx, bot.ID)
	if cfgErr != nil {
		uc.log.Warn("bot configuration not found — using identity-only system prompt",
			zap.String("bot_id", bot.ID),
			zap.Error(cfgErr),
		)
	}

	// Build a composite system prompt that always tells the LLM who the bot is.
	// Layer order (highest specificity last so it can override):
	//   1. Bot identity block  — name, purpose, department  (always present)
	//   2. Tone / writing style from config
	//   3. Custom system prompt from config (admin-authored persona instructions)
	//   4. Caller-passed systemPrompt (test-panel override, appended last)
	var promptParts []string

	// 1. Identity block
	identityLine := fmt.Sprintf("You are %s", bot.Name)
	if bot.Department != "" {
		identityLine += fmt.Sprintf(", operating in the %s department", bot.Department)
	}
	identityLine += "."
	promptParts = append(promptParts, identityLine)
	if bot.Purpose != "" {
		promptParts = append(promptParts, fmt.Sprintf("Your purpose: %s", bot.Purpose))
	}

	// 2. Tone / style from config
	if cfgErr == nil {
		if cfg.Tone != "" {
			promptParts = append(promptParts, fmt.Sprintf("Tone: %s.", cfg.Tone))
		}
		if cfg.WritingStyle != "" {
			promptParts = append(promptParts, fmt.Sprintf("Writing style: %s.", cfg.WritingStyle))
		}
		// 3. Custom system prompt (detailed persona / instructions)
		if cfg.CustomSystemPrompt != "" {
			promptParts = append(promptParts, cfg.CustomSystemPrompt)
		}
	}

	// 4. Explicit override from caller (test-panel may pass one)
	if input.SystemPrompt != "" {
		promptParts = append(promptParts, input.SystemPrompt)
	}

	systemPrompt := strings.Join(promptParts, "\n\n")

	// ─── Resolve model settings from config (with safe defaults) ────────────
	provider := "openai"
	model := "gpt-4o-mini"
	maxTokens := 1024
	temperature := 0.7

	if cfgErr == nil {
		if cfg.AIModel != "" {
			model = cfg.AIModel
		}
		if cfg.MaxResponseTokens > 0 {
			maxTokens = cfg.MaxResponseTokens
		}
		if cfg.Temperature > 0 {
			temperature = cfg.Temperature
		}
	}

	// ─── Build messages array: [system] + [history] + [current user] ────────
	messages := make([]*aiv1.ChatMessage, 0, len(input.History)+2)

	if systemPrompt != "" {
		messages = append(messages, &aiv1.ChatMessage{Role: "system", Content: systemPrompt})
	}

	// History is already in oldest-first order (sent from frontend / XMPP fetcher)
	for _, h := range input.History {
		role := h.Role
		// Normalise any unexpected role values to avoid API rejections
		if role != "user" && role != "assistant" {
			continue
		}
		messages = append(messages, &aiv1.ChatMessage{Role: role, Content: h.Content})
	}

	messages = append(messages, &aiv1.ChatMessage{Role: "user", Content: input.Message})

	// ─── Call AI service ─────────────────────────────────────────────────────
	resp, err := uc.aiClient.ChatCompletion(ctx, &aiv1.ChatCompletionRequest{
		Provider:          provider,
		Model:             model,
		Messages:          messages,
		Temperature:       temperature,
		MaxTokens:         int32(maxTokens),
		BotId:             bot.ID,
		ServiceProviderId: bot.ServiceProviderID,
	})
	if err != nil {
		uc.log.Error("ai chat completion failed", zap.Error(err), zap.String("bot_id", bot.ID))
		return "", false, bizerr.Internal("ai chat completion failed", err)
	}

	// ─── Build response JSON matching frontend expectation ───────────────────
	result := map[string]interface{}{
		"response":    resp.GetContent(),
		"model":       resp.GetModel(),
		"provider":    resp.GetProvider(),
		"tokens_used": resp.GetPromptTokens() + resp.GetCompletionTokens(),
	}
	outputBytes, _ := json.Marshal(result)
	outputJSON := string(outputBytes)

	uc.statsRepo.IncrementActions(ctx, bot.ID)

	uc.log.Info("test_prompt executed",
		zap.String("bot_id", bot.ID),
		zap.String("model", model),
		zap.Int("history_turns", len(input.History)),
		zap.Int("duration_ms", int(time.Since(start).Milliseconds())),
	)

	return outputJSON, false, nil
}

// AddKnowledgeSource adds a knowledge source to a bot.
func (uc *BotUseCase) AddKnowledgeSource(ctx context.Context, botID, spID, sourceType, name, description, content, s3Key, fileType string, fileSize int64) (*entity.KnowledgeSource, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.AddKnowledgeSource",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}

	source := &entity.KnowledgeSource{
		ID:          uuid.New().String(),
		BotID:       botID,
		SourceType:  entity.KnowledgeSourceType(sourceType),
		Name:        name,
		Description: description,
		Content:     content,
		S3Key:       s3Key,
		FileType:    fileType,
		FileSize:    fileSize,
		Status:      entity.KnowledgeSourcePending,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}

	if err := uc.sourceRepo.Create(ctx, source); err != nil {
		return nil, bizerr.Internal("failed to create knowledge source", err)
	}
	return source, nil
}

// GetBotConfiguration retrieves the configuration for a bot.
func (uc *BotUseCase) GetBotConfiguration(ctx context.Context, botID, spID string) (*entity.BotConfiguration, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.GetBotConfiguration",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}
	return uc.configRepo.Get(ctx, botID)
}

// UpdateBotConfiguration updates the configuration for a bot.
func (uc *BotUseCase) UpdateBotConfiguration(ctx context.Context, botID, spID string, config *entity.BotConfiguration) (*entity.BotConfiguration, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.UpdateBotConfiguration",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}

	config.BotID = botID
	if err := uc.configRepo.Upsert(ctx, config); err != nil {
		return nil, bizerr.Internal("failed to update bot configuration", err)
	}
	return uc.configRepo.Get(ctx, botID)
}

// SetBotPermission sets a tool permission for a bot.
func (uc *BotUseCase) SetBotPermission(ctx context.Context, botID, spID, toolName string, isAllowed bool, constraints string) error {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.SetBotPermission",
		attribute.String("bot_id", botID),
		attribute.String("tool_name", toolName),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return err
	}
	if bot.ServiceProviderID != spID {
		return bizerr.Forbidden("bot does not belong to this service provider")
	}

	perm := &entity.BotPermission{
		ID:          uuid.New().String(),
		BotID:       botID,
		ToolName:    toolName,
		IsAllowed:   isAllowed,
		Constraints: constraints,
	}
	return uc.permRepo.Set(ctx, perm)
}

// ListBotPermissions returns all permissions for a bot.
func (uc *BotUseCase) ListBotPermissions(ctx context.Context, botID, spID string) ([]*entity.BotPermission, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ListBotPermissions",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}
	return uc.permRepo.ListByBot(ctx, botID)
}

// RemoveKnowledgeSource removes a knowledge source from a bot.
func (uc *BotUseCase) RemoveKnowledgeSource(ctx context.Context, sourceID, botID, spID string) error {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.RemoveKnowledgeSource",
		attribute.String("bot_id", botID),
		attribute.String("source_id", sourceID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return err
	}
	if bot.ServiceProviderID != spID {
		return bizerr.Forbidden("bot does not belong to this service provider")
	}
	return uc.sourceRepo.Delete(ctx, sourceID)
}

// ListKnowledgeSources returns all knowledge sources for a bot.
func (uc *BotUseCase) ListKnowledgeSources(ctx context.Context, botID, spID string) ([]*entity.KnowledgeSource, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ListKnowledgeSources",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}
	return uc.sourceRepo.ListByBot(ctx, botID)
}

// ListBotActionLogs returns action logs for a bot, optionally filtered by conversation.
func (uc *BotUseCase) ListBotActionLogs(ctx context.Context, botID, spID, conversationID string, limit, offset int) ([]*entity.BotActionLog, int, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ListBotActionLogs",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, 0, err
	}
	if bot.ServiceProviderID != spID {
		return nil, 0, bizerr.Forbidden("bot does not belong to this service provider")
	}

	if conversationID != "" {
		return uc.actionRepo.ListByConversation(ctx, conversationID, limit, offset)
	}
	return uc.actionRepo.ListByBot(ctx, botID, limit, offset)
}

// GetBotAnalytics retrieves analytics for a bot.
func (uc *BotUseCase) GetBotAnalytics(ctx context.Context, botID, spID string) (*entity.BotAnalytics, error) {
	ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.GetBotAnalytics",
		attribute.String("bot_id", botID),
	)
	defer span.End()

	bot, err := uc.botRepo.GetByID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if bot.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("bot does not belong to this service provider")
	}
	return uc.statsRepo.Get(ctx, botID)
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}

// publishEvent fires a domain event asynchronously.
func (uc *BotUseCase) publishEvent(ctx context.Context, eventType events.EventType, entityID, userID, spID string, payload interface{}) {
	if uc.publisher == nil {
		return
	}
	evt, err := events.NewEvent(eventType, payload)
	if err != nil {
		uc.log.Error("failed to create event", zap.String("event_type", string(eventType)), zap.Error(err))
		return
	}
	evt.WithEntity(entityID).WithUser(userID).WithServiceProvider(spID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish event", zap.String("event_type", string(eventType)), zap.Error(err))
	}
}
