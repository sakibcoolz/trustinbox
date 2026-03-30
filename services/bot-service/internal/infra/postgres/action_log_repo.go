package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
)

type actionLogRepo struct {
	db *sql.DB
}

// NewBotActionLogRepository creates a new PostgreSQL-backed BotActionLogRepository.
func NewBotActionLogRepository(db *sql.DB) repository.BotActionLogRepository {
	return &actionLogRepo{db: db}
}

func (r *actionLogRepo) Create(ctx context.Context, log *entity.BotActionLog) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO bot_action_logs (id, bot_id, conversation_id, user_id, action_type, tool_used, input_summary, output_summary, policy_decision, policy_reason, duration_ms, success, error_message, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		log.ID, log.BotID, nullStr(log.ConversationID), nullStr(log.UserID),
		log.ActionType, log.ToolUsed, log.InputSummary, log.OutputSummary,
		log.PolicyDecision, log.PolicyReason, log.DurationMS,
		log.Success, log.ErrorMessage, log.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert action log: %w", err)
	}
	return nil
}

func (r *actionLogRepo) ListByBot(ctx context.Context, botID string, limit, offset int) ([]*entity.BotActionLog, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM bot_action_logs WHERE bot_id = $1`, botID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count action logs: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, bot_id, conversation_id, user_id, action_type, tool_used, input_summary, output_summary, policy_decision, policy_reason, duration_ms, success, error_message, created_at
		 FROM bot_action_logs WHERE bot_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		botID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list action logs: %w", err)
	}
	defer rows.Close()

	logs, err := scanActionLogs(rows)
	if err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

func (r *actionLogRepo) ListByConversation(ctx context.Context, conversationID string, limit, offset int) ([]*entity.BotActionLog, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM bot_action_logs WHERE conversation_id = $1`, conversationID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count action logs: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, bot_id, conversation_id, user_id, action_type, tool_used, input_summary, output_summary, policy_decision, policy_reason, duration_ms, success, error_message, created_at
		 FROM bot_action_logs WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		conversationID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list action logs by conversation: %w", err)
	}
	defer rows.Close()

	logs, err := scanActionLogs(rows)
	if err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

func scanActionLogs(rows *sql.Rows) ([]*entity.BotActionLog, error) {
	var logs []*entity.BotActionLog
	for rows.Next() {
		var l entity.BotActionLog
		var convID, userID sql.NullString
		if err := rows.Scan(&l.ID, &l.BotID, &convID, &userID,
			&l.ActionType, &l.ToolUsed, &l.InputSummary, &l.OutputSummary,
			&l.PolicyDecision, &l.PolicyReason, &l.DurationMS,
			&l.Success, &l.ErrorMessage, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan action log: %w", err)
		}
		l.ConversationID = convID.String
		l.UserID = userID.String
		logs = append(logs, &l)
	}
	return logs, rows.Err()
}
