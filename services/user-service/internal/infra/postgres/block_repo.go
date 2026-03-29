package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/domain/repository"
)

type blockRepo struct {
	db *sql.DB
}

func NewBlockedOrganizationRepository(db *sql.DB) repository.BlockedOrganizationRepository {
	return &blockRepo{db: db}
}

func (r *blockRepo) IsBlocked(ctx context.Context, userID, orgID string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM blocked_organizations WHERE user_id = $1 AND organization_id = $2`,
		userID, orgID,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check blocked status: %w", err)
	}
	return count > 0, nil
}

func (r *blockRepo) Block(ctx context.Context, blocked *entity.BlockedOrganization) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO blocked_organizations (id, user_id, organization_id, reason, created_at)
		 VALUES ($1, $2, $3, $4, NOW())`,
		blocked.ID, blocked.UserID, blocked.OrganizationID, blocked.Reason,
	)
	return err
}

func (r *blockRepo) Unblock(ctx context.Context, userID, orgID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM blocked_organizations WHERE user_id = $1 AND organization_id = $2`, userID, orgID,
	)
	return err
}

func (r *blockRepo) ListByUser(ctx context.Context, userID string) ([]entity.BlockedOrganization, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, organization_id, reason, created_at
		 FROM blocked_organizations WHERE user_id = $1`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list blocked organizations: %w", err)
	}
	defer rows.Close()

	var blocked []entity.BlockedOrganization
	for rows.Next() {
		var b entity.BlockedOrganization
		if err := rows.Scan(&b.ID, &b.UserID, &b.OrganizationID, &b.Reason, &b.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan blocked organization: %w", err)
		}
		blocked = append(blocked, b)
	}
	return blocked, rows.Err()
}
