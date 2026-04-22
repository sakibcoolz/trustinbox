package repository

import (
	"context"

	"github.com/trustinbox/bot-service/internal/domain/entity"
)

// BotWorkflowConfigRepository defines persistence for workflow configurations.
type BotWorkflowConfigRepository interface {
	Create(ctx context.Context, cfg *entity.BotWorkflowConfig) error
	GetByID(ctx context.Context, id string) (*entity.BotWorkflowConfig, error)
	GetByWorkflowID(ctx context.Context, botID, workflowID string) (*entity.BotWorkflowConfig, error)
	Update(ctx context.Context, cfg *entity.BotWorkflowConfig) error
	Delete(ctx context.Context, id string) error
	ListByBot(ctx context.Context, botID string) ([]*entity.BotWorkflowConfig, error)
}

// BotWorkflowSuspensionRepository defines persistence for async workflow suspensions.
type BotWorkflowSuspensionRepository interface {
	Create(ctx context.Context, s *entity.BotWorkflowSuspension) error
	GetByResumeToken(ctx context.Context, token string) (*entity.BotWorkflowSuspension, error)
	MarkResumed(ctx context.Context, token, resultJSON string) error
	DeleteExpired(ctx context.Context) error
}
