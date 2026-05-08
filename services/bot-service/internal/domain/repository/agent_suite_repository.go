package repository

import (
	"context"

	"github.com/trustinbox/bot-service/internal/domain/entity"
)

// AgentSuiteRepository defines persistence for agent suites.
type AgentSuiteRepository interface {
	Create(ctx context.Context, suite *entity.AgentSuite) error
	GetBySP(ctx context.Context, spID string) (*entity.AgentSuite, error)
	UpdateStatus(ctx context.Context, id string, status entity.AgentSuiteStatus) error
}

// AgentDelegationRepository defines persistence for agent delegation logs.
type AgentDelegationRepository interface {
	Create(ctx context.Context, log *entity.AgentDelegationLog) error
	ListByManager(ctx context.Context, managerBotID string, limit, offset int) ([]*entity.AgentDelegationLog, int, error)
}
