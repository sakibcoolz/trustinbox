package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
)

type agentSuiteRepo struct {
	db *sql.DB
}

// NewAgentSuiteRepository creates a new PostgreSQL-backed AgentSuiteRepository.
func NewAgentSuiteRepository(db *sql.DB) repository.AgentSuiteRepository {
	return &agentSuiteRepo{db: db}
}

func (r *agentSuiteRepo) Create(ctx context.Context, suite *entity.AgentSuite) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO sp_agent_suites (id, service_provider_id, manager_bot_id, status, provisioned_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		suite.ID, suite.ServiceProviderID, suite.ManagerBotID, string(suite.Status),
		suite.ProvisionedAt, suite.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert agent suite: %w", err)
	}
	return nil
}

func (r *agentSuiteRepo) GetBySP(ctx context.Context, spID string) (*entity.AgentSuite, error) {
	var s entity.AgentSuite
	var status string
	err := r.db.QueryRowContext(ctx,
		`SELECT id, service_provider_id, manager_bot_id, status, provisioned_at, updated_at
		 FROM sp_agent_suites WHERE service_provider_id = $1`, spID,
	).Scan(&s.ID, &s.ServiceProviderID, &s.ManagerBotID, &status, &s.ProvisionedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("agent suite", spID)
	}
	if err != nil {
		return nil, fmt.Errorf("get agent suite: %w", err)
	}
	s.Status = entity.AgentSuiteStatus(status)
	return &s, nil
}

func (r *agentSuiteRepo) UpdateStatus(ctx context.Context, id string, status entity.AgentSuiteStatus) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE sp_agent_suites SET status = $2, updated_at = NOW() WHERE id = $1`,
		id, string(status),
	)
	if err != nil {
		return fmt.Errorf("update agent suite status: %w", err)
	}
	return nil
}
