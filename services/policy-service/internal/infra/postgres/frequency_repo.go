package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/trustinbox/policy-service/internal/domain/repository"
)

type frequencyRepo struct {
	db *sql.DB
}

func NewFrequencyRepository(db *sql.DB) repository.FrequencyRepository {
	return &frequencyRepo{db: db}
}

func (r *frequencyRepo) GetAdCountForUser(ctx context.Context, userID, spID string) (int, error) {
	var count int
	today := time.Now().Truncate(24 * time.Hour)
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM notifications
		 WHERE user_id = $1 AND service_provider_id = $2 AND category = 'ADVERTISEMENT' AND created_at >= $3`,
		userID, spID, today,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("get ad count: %w", err)
	}
	return count, nil
}

func (r *frequencyRepo) IncrementAdCount(ctx context.Context, userID, spID string) error {
	// Ad count is derived from notification frequency — no separate tracking needed.
	// This is a no-op; the count increments naturally when a notification is created.
	return nil
}
