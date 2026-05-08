package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
)

type delegationRepo struct {
	db *sql.DB
}

// NewAgentDelegationRepository creates a new PostgreSQL-backed AgentDelegationRepository.
func NewAgentDelegationRepository(db *sql.DB) repository.AgentDelegationRepository {
	return &delegationRepo{db: db}
}

func (r *delegationRepo) Create(ctx context.Context, log *entity.AgentDelegationLog) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO agent_delegation_logs
		 (id, manager_bot_id, target_bot_id, service_provider_id, user_id, conversation_id, thread_id, delegation_depth,
		  intent_detected, confidence_score, input_summary, output_summary, duration_ms, success, error_message, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
		log.ID, log.ManagerBotID, log.TargetBotID, nullStr(log.ServiceProviderID), log.UserID,
		nullStr(log.ConversationID), nullStr(log.ThreadID), log.DelegationDepth,
		log.IntentDetected, log.ConfidenceScore, log.InputSummary, log.OutputSummary,
		log.DurationMS, log.Success, log.ErrorMessage, log.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert delegation log: %w", err)
	}
	return nil
}

func (r *delegationRepo) ListByManager(ctx context.Context, managerBotID string, limit, offset int) ([]*entity.AgentDelegationLog, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM agent_delegation_logs WHERE manager_bot_id = $1`, managerBotID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count delegation logs: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, manager_bot_id, target_bot_id, service_provider_id, user_id, conversation_id, thread_id, delegation_depth,
		        intent_detected, confidence_score, input_summary, output_summary, duration_ms, success, error_message, created_at
		 FROM agent_delegation_logs WHERE manager_bot_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		managerBotID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list delegation logs: %w", err)
	}
	defer rows.Close()

	var logs []*entity.AgentDelegationLog
	for rows.Next() {
		var l entity.AgentDelegationLog
		var spID, convID, threadID sql.NullString
		if err := rows.Scan(
			&l.ID, &l.ManagerBotID, &l.TargetBotID, &spID, &l.UserID, &convID, &threadID, &l.DelegationDepth,
			&l.IntentDetected, &l.ConfidenceScore, &l.InputSummary, &l.OutputSummary,
			&l.DurationMS, &l.Success, &l.ErrorMessage, &l.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan delegation log: %w", err)
		}
		l.ServiceProviderID = spID.String
		l.ConversationID = convID.String
		l.ThreadID = threadID.String
		logs = append(logs, &l)
	}
	return logs, total, rows.Err()
}
