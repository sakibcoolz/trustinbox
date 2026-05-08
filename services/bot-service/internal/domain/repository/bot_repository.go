package repository

import (
	"context"

	"github.com/trustinbox/bot-service/internal/domain/entity"
)

// BotRepository defines persistence operations for bots.
type BotRepository interface {
	Create(ctx context.Context, bot *entity.Bot) error
	GetByID(ctx context.Context, id string) (*entity.Bot, error)
	Update(ctx context.Context, bot *entity.Bot) error
	Delete(ctx context.Context, id string) error
	ListBySP(ctx context.Context, spID, status, agentType string, limit, offset int) ([]*entity.Bot, int, error)
	ListByManager(ctx context.Context, managerBotID string) ([]*entity.Bot, error)
	// GetManagerBySP returns the SP's MANAGER bot. Per product rule #9 there is
	// exactly one per service provider; sub-agents are never returned here.
	GetManagerBySP(ctx context.Context, spID string) (*entity.Bot, error)
}

// BotConfigurationRepository defines persistence for bot configurations.
type BotConfigurationRepository interface {
	Get(ctx context.Context, botID string) (*entity.BotConfiguration, error)
	Upsert(ctx context.Context, config *entity.BotConfiguration) error
}

// BotPermissionRepository defines persistence for bot permissions.
type BotPermissionRepository interface {
	Set(ctx context.Context, perm *entity.BotPermission) error
	ListByBot(ctx context.Context, botID string) ([]*entity.BotPermission, error)
	IsToolAllowed(ctx context.Context, botID, toolName string) (bool, error)
}

// KnowledgeSourceRepository defines persistence for knowledge sources.
type KnowledgeSourceRepository interface {
	Create(ctx context.Context, source *entity.KnowledgeSource) error
	GetByID(ctx context.Context, id string) (*entity.KnowledgeSource, error)
	Delete(ctx context.Context, id string) error
	ListByBot(ctx context.Context, botID string) ([]*entity.KnowledgeSource, error)
	UpdateStatus(ctx context.Context, id string, status entity.KnowledgeSourceStatus) error
}

// BotActionLogRepository defines persistence for bot action logs.
type BotActionLogRepository interface {
	Create(ctx context.Context, log *entity.BotActionLog) error
	ListByBot(ctx context.Context, botID string, limit, offset int) ([]*entity.BotActionLog, int, error)
	ListByConversation(ctx context.Context, conversationID string, limit, offset int) ([]*entity.BotActionLog, int, error)
}

// BotAnalyticsRepository defines persistence for bot analytics.
type BotAnalyticsRepository interface {
	Get(ctx context.Context, botID string) (*entity.BotAnalytics, error)
	IncrementConversations(ctx context.Context, botID string) error
	IncrementMessages(ctx context.Context, botID string, sent, received int) error
	IncrementActions(ctx context.Context, botID string) error
	IncrementEscalations(ctx context.Context, botID string) error
}
