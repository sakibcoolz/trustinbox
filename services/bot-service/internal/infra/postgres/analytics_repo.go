package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
)

type analyticsRepo struct {
	db *sql.DB
}

// NewBotAnalyticsRepository creates a new PostgreSQL-backed BotAnalyticsRepository.
func NewBotAnalyticsRepository(db *sql.DB) repository.BotAnalyticsRepository {
	return &analyticsRepo{db: db}
}

func (r *analyticsRepo) Get(ctx context.Context, botID string) (*entity.BotAnalytics, error) {
	var a entity.BotAnalytics
	err := r.db.QueryRowContext(ctx,
		`SELECT bot_id, total_conversations, total_messages_sent, total_messages_received,
		        total_actions_executed, total_escalations, avg_response_time_ms,
		        avg_turns_per_conversation, escalation_rate, resolution_rate,
		        satisfaction_score, last_active_at
		 FROM bot_analytics WHERE bot_id = $1`, botID,
	).Scan(&a.BotID, &a.TotalConversations, &a.TotalMessagesSent, &a.TotalMessagesReceived,
		&a.TotalActionsExecuted, &a.TotalEscalations, &a.AvgResponseTimeMS,
		&a.AvgTurnsPerConversation, &a.EscalationRate, &a.ResolutionRate,
		&a.SatisfactionScore, &a.LastActiveAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("bot_analytics", botID)
	}
	if err != nil {
		return nil, fmt.Errorf("get bot analytics: %w", err)
	}
	return &a, nil
}

func (r *analyticsRepo) ensureRow(ctx context.Context, botID string) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO bot_analytics (bot_id) VALUES ($1) ON CONFLICT (bot_id) DO NOTHING`, botID,
	)
	return err
}

func (r *analyticsRepo) IncrementConversations(ctx context.Context, botID string) error {
	if err := r.ensureRow(ctx, botID); err != nil {
		return fmt.Errorf("ensure analytics row: %w", err)
	}
	_, err := r.db.ExecContext(ctx,
		`UPDATE bot_analytics SET total_conversations = total_conversations + 1, last_active_at = NOW(), updated_at = NOW() WHERE bot_id = $1`, botID,
	)
	if err != nil {
		return fmt.Errorf("increment conversations: %w", err)
	}
	return nil
}

func (r *analyticsRepo) IncrementMessages(ctx context.Context, botID string, sent, received int) error {
	if err := r.ensureRow(ctx, botID); err != nil {
		return fmt.Errorf("ensure analytics row: %w", err)
	}
	_, err := r.db.ExecContext(ctx,
		`UPDATE bot_analytics SET total_messages_sent = total_messages_sent + $2, total_messages_received = total_messages_received + $3, last_active_at = NOW(), updated_at = NOW() WHERE bot_id = $1`,
		botID, sent, received,
	)
	if err != nil {
		return fmt.Errorf("increment messages: %w", err)
	}
	return nil
}

func (r *analyticsRepo) IncrementActions(ctx context.Context, botID string) error {
	if err := r.ensureRow(ctx, botID); err != nil {
		return fmt.Errorf("ensure analytics row: %w", err)
	}
	_, err := r.db.ExecContext(ctx,
		`UPDATE bot_analytics SET total_actions_executed = total_actions_executed + 1, last_active_at = NOW(), updated_at = NOW() WHERE bot_id = $1`, botID,
	)
	if err != nil {
		return fmt.Errorf("increment actions: %w", err)
	}
	return nil
}

func (r *analyticsRepo) IncrementEscalations(ctx context.Context, botID string) error {
	if err := r.ensureRow(ctx, botID); err != nil {
		return fmt.Errorf("ensure analytics row: %w", err)
	}
	_, err := r.db.ExecContext(ctx,
		`UPDATE bot_analytics SET total_escalations = total_escalations + 1, last_active_at = NOW(), updated_at = NOW() WHERE bot_id = $1`, botID,
	)
	if err != nil {
		return fmt.Errorf("increment escalations: %w", err)
	}
	return nil
}
