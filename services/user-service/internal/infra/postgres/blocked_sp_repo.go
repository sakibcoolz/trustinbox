package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/domain/repository"
)

type blockedSPRepo struct {
	db *sql.DB
}

func NewBlockedServiceProviderRepository(db *sql.DB) repository.BlockedServiceProviderRepository {
	return &blockedSPRepo{db: db}
}

func (r *blockedSPRepo) IsBlocked(ctx context.Context, userID, spID string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM blocked_service_providers WHERE user_id = $1 AND service_provider_id = $2)`,
		userID, spID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check blocked sp: %w", err)
	}
	return exists, nil
}

func (r *blockedSPRepo) Block(ctx context.Context, blocked *entity.BlockedServiceProvider) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO blocked_service_providers (id, user_id, service_provider_id, reason, created_at)
		 VALUES ($1, $2, $3, $4, NOW())
		 ON CONFLICT (user_id, service_provider_id) DO NOTHING`,
		blocked.ID, blocked.UserID, blocked.ServiceProviderID, blocked.Reason,
	)
	if err != nil {
		return fmt.Errorf("block sp: %w", err)
	}
	return nil
}

func (r *blockedSPRepo) Unblock(ctx context.Context, userID, spID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM blocked_service_providers WHERE user_id = $1 AND service_provider_id = $2`,
		userID, spID,
	)
	if err != nil {
		return fmt.Errorf("unblock sp: %w", err)
	}
	return nil
}

func (r *blockedSPRepo) ListByUser(ctx context.Context, userID string) ([]entity.BlockedServiceProvider, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, service_provider_id, reason, created_at
		 FROM blocked_service_providers WHERE user_id = $1 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list blocked sps: %w", err)
	}
	defer rows.Close()

	var blocked []entity.BlockedServiceProvider
	for rows.Next() {
		var b entity.BlockedServiceProvider
		if err := rows.Scan(&b.ID, &b.UserID, &b.ServiceProviderID, &b.Reason, &b.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan blocked sp: %w", err)
		}
		blocked = append(blocked, b)
	}
	return blocked, rows.Err()
}
