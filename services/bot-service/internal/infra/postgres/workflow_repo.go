package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
)

// ─── BotWorkflowConfigRepository ─────────────────────────────────────────────

type workflowConfigRepo struct {
	db *sql.DB
}

// NewBotWorkflowConfigRepository creates a PostgreSQL-backed BotWorkflowConfigRepository.
func NewBotWorkflowConfigRepository(db *sql.DB) repository.BotWorkflowConfigRepository {
	return &workflowConfigRepo{db: db}
}

func (r *workflowConfigRepo) Create(ctx context.Context, cfg *entity.BotWorkflowConfig) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO bot_workflow_configs
		 (id, bot_id, workflow_id, workflow_name, webhook_path, description, is_active, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		cfg.ID, cfg.BotID, cfg.WorkflowID, cfg.WorkflowName,
		cfg.WebhookPath, cfg.Description, cfg.IsActive,
		cfg.CreatedAt, cfg.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create workflow config: %w", err)
	}
	return nil
}

func (r *workflowConfigRepo) GetByID(ctx context.Context, id string) (*entity.BotWorkflowConfig, error) {
	return r.scanOne(r.db.QueryRowContext(ctx,
		`SELECT id, bot_id, workflow_id, workflow_name, webhook_path, description, is_active, created_at, updated_at
		 FROM bot_workflow_configs WHERE id = $1`, id))
}

func (r *workflowConfigRepo) GetByWorkflowID(ctx context.Context, botID, workflowID string) (*entity.BotWorkflowConfig, error) {
	return r.scanOne(r.db.QueryRowContext(ctx,
		`SELECT id, bot_id, workflow_id, workflow_name, webhook_path, description, is_active, created_at, updated_at
		 FROM bot_workflow_configs WHERE bot_id = $1 AND workflow_id = $2`, botID, workflowID))
}

func (r *workflowConfigRepo) Update(ctx context.Context, cfg *entity.BotWorkflowConfig) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE bot_workflow_configs
		 SET workflow_name = $1, webhook_path = $2, description = $3, is_active = $4, updated_at = NOW()
		 WHERE id = $5 AND bot_id = $6`,
		cfg.WorkflowName, cfg.WebhookPath, cfg.Description, cfg.IsActive,
		cfg.ID, cfg.BotID,
	)
	if err != nil {
		return fmt.Errorf("update workflow config: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return bizerr.NotFound("workflow_config", cfg.ID)
	}
	return nil
}

func (r *workflowConfigRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM bot_workflow_configs WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete workflow config: %w", err)
	}
	return nil
}

func (r *workflowConfigRepo) ListByBot(ctx context.Context, botID string) ([]*entity.BotWorkflowConfig, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, bot_id, workflow_id, workflow_name, webhook_path, description, is_active, created_at, updated_at
		 FROM bot_workflow_configs WHERE bot_id = $1 ORDER BY created_at DESC`, botID)
	if err != nil {
		return nil, fmt.Errorf("list workflow configs: %w", err)
	}
	defer rows.Close()

	var cfgs []*entity.BotWorkflowConfig
	for rows.Next() {
		cfg, err := r.scanRow(rows)
		if err != nil {
			return nil, err
		}
		cfgs = append(cfgs, cfg)
	}
	return cfgs, rows.Err()
}

func (r *workflowConfigRepo) scanOne(row *sql.Row) (*entity.BotWorkflowConfig, error) {
	var cfg entity.BotWorkflowConfig
	err := row.Scan(
		&cfg.ID, &cfg.BotID, &cfg.WorkflowID, &cfg.WorkflowName,
		&cfg.WebhookPath, &cfg.Description, &cfg.IsActive,
		&cfg.CreatedAt, &cfg.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("workflow_config", "")
	}
	if err != nil {
		return nil, fmt.Errorf("scan workflow config: %w", err)
	}
	return &cfg, nil
}

func (r *workflowConfigRepo) scanRow(rows *sql.Rows) (*entity.BotWorkflowConfig, error) {
	var cfg entity.BotWorkflowConfig
	err := rows.Scan(
		&cfg.ID, &cfg.BotID, &cfg.WorkflowID, &cfg.WorkflowName,
		&cfg.WebhookPath, &cfg.Description, &cfg.IsActive,
		&cfg.CreatedAt, &cfg.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("scan workflow config row: %w", err)
	}
	return &cfg, nil
}

// ─── BotWorkflowSuspensionRepository ─────────────────────────────────────────

type workflowSuspensionRepo struct {
	db *sql.DB
}

// NewBotWorkflowSuspensionRepository creates a PostgreSQL-backed BotWorkflowSuspensionRepository.
func NewBotWorkflowSuspensionRepository(db *sql.DB) repository.BotWorkflowSuspensionRepository {
	return &workflowSuspensionRepo{db: db}
}

func (r *workflowSuspensionRepo) Create(ctx context.Context, s *entity.BotWorkflowSuspension) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO bot_workflow_suspensions
		 (id, resume_token, bot_id, conversation_id, user_id, workflow_id, status, created_at, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)`,
		s.ID, s.ResumeToken, s.BotID, s.ConversationID,
		s.UserID, s.WorkflowID, s.CreatedAt, s.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("create workflow suspension: %w", err)
	}
	return nil
}

func (r *workflowSuspensionRepo) GetByResumeToken(ctx context.Context, token string) (*entity.BotWorkflowSuspension, error) {
	var s entity.BotWorkflowSuspension
	var resumedAt sql.NullTime
	err := r.db.QueryRowContext(ctx,
		`SELECT id, resume_token, bot_id, conversation_id, user_id, workflow_id,
		        status, result_json, created_at, expires_at, resumed_at
		 FROM bot_workflow_suspensions WHERE resume_token = $1`, token,
	).Scan(
		&s.ID, &s.ResumeToken, &s.BotID, &s.ConversationID,
		&s.UserID, &s.WorkflowID, &s.Status, &s.ResultJSON,
		&s.CreatedAt, &s.ExpiresAt, &resumedAt,
	)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("workflow_suspension", token)
	}
	if err != nil {
		return nil, fmt.Errorf("get workflow suspension: %w", err)
	}
	if resumedAt.Valid {
		t := resumedAt.Time
		s.ResumedAt = &t
	}
	return &s, nil
}

func (r *workflowSuspensionRepo) MarkResumed(ctx context.Context, token, resultJSON string) error {
	now := time.Now().UTC()
	res, err := r.db.ExecContext(ctx,
		`UPDATE bot_workflow_suspensions
		 SET status = 'RESUMED', result_json = $1, resumed_at = $2
		 WHERE resume_token = $3 AND status = 'PENDING' AND expires_at > NOW()`,
		resultJSON, now, token,
	)
	if err != nil {
		return fmt.Errorf("mark workflow resumed: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return bizerr.NotFound("workflow_suspension", token)
	}
	return nil
}

func (r *workflowSuspensionRepo) DeleteExpired(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM bot_workflow_suspensions WHERE expires_at < NOW() AND status = 'PENDING'`)
	if err != nil {
		return fmt.Errorf("delete expired suspensions: %w", err)
	}
	return nil
}
