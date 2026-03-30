package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
)

// PolicyChecker evaluates whether a bot action is allowed.
type PolicyChecker interface {
	EvaluateBotAction(ctx context.Context, botID, userID, toolName string) (allowed bool, reason string, err error)
}

// BotUseCase implements bot lifecycle and action operations.
type BotUseCase struct {
	botRepo    repository.BotRepository
	configRepo repository.BotConfigurationRepository
	permRepo   repository.BotPermissionRepository
	sourceRepo repository.KnowledgeSourceRepository
	actionRepo repository.BotActionLogRepository
	statsRepo  repository.BotAnalyticsRepository
	policy     PolicyChecker
}

// NewBotUseCase creates a new BotUseCase.
func NewBotUseCase(
	botRepo repository.BotRepository,
	configRepo repository.BotConfigurationRepository,
	permRepo repository.BotPermissionRepository,
	sourceRepo repository.KnowledgeSourceRepository,
	actionRepo repository.BotActionLogRepository,
	statsRepo repository.BotAnalyticsRepository,
	policy PolicyChecker,
) *BotUseCase {
	return &BotUseCase{
		botRepo:    botRepo,
		configRepo: configRepo,
		permRepo:   permRepo,
		sourceRepo: sourceRepo,
		actionRepo: actionRepo,
		statsRepo:  statsRepo,
		policy:     policy,
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

	// TODO: Execute the actual tool action via AI orchestration layer
	outputJSON := `{"status":"executed","tool":"` + toolName + `"}`

	actionLog.OutputSummary = truncate(outputJSON, 500)
	actionLog.DurationMS = int(time.Since(start).Milliseconds())
	uc.actionRepo.Create(ctx, actionLog)

	// Update analytics
	uc.statsRepo.IncrementActions(ctx, botID)

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
