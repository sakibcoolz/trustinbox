package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/domain/repository"
)

type orgUserRepo struct {
	db *sql.DB
}

func NewOrganizationUserRepository(db *sql.DB) repository.OrganizationUserRepository {
	return &orgUserRepo{db: db}
}

func (r *orgUserRepo) Add(ctx context.Context, orgUser *entity.OrganizationUser) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO organization_users (id, organization_id, user_id, role, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		orgUser.ID, orgUser.OrganizationID, orgUser.UserID, orgUser.Role, orgUser.Status,
	)
	if err != nil {
		return fmt.Errorf("failed to add organization user: %w", err)
	}
	return nil
}

func (r *orgUserRepo) Remove(ctx context.Context, id, orgID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM organization_users WHERE id=$1 AND organization_id=$2`,
		id, orgID,
	)
	if err != nil {
		return fmt.Errorf("failed to remove organization user: %w", err)
	}
	return nil
}

func (r *orgUserRepo) GetByID(ctx context.Context, id string) (*entity.OrganizationUser, error) {
	u := &entity.OrganizationUser{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, organization_id, user_id, role, status, created_at
		 FROM organization_users WHERE id=$1`, id,
	).Scan(&u.ID, &u.OrganizationID, &u.UserID, &u.Role, &u.Status, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("organization user not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get organization user: %w", err)
	}
	return u, nil
}

func (r *orgUserRepo) ListByOrg(ctx context.Context, orgID string, limit, offset int) ([]entity.OrganizationUser, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM organization_users WHERE organization_id=$1`, orgID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count organization users: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, organization_id, user_id, role, status, created_at
		 FROM organization_users WHERE organization_id=$1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
		orgID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list organization users: %w", err)
	}
	defer rows.Close()

	var users []entity.OrganizationUser
	for rows.Next() {
		var u entity.OrganizationUser
		if err := rows.Scan(&u.ID, &u.OrganizationID, &u.UserID, &u.Role, &u.Status, &u.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("failed to scan organization user: %w", err)
		}
		users = append(users, u)
	}
	return users, total, rows.Err()
}

func (r *orgUserRepo) GetByOrgAndUser(ctx context.Context, orgID, userID string) (*entity.OrganizationUser, error) {
	u := &entity.OrganizationUser{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, organization_id, user_id, role, status, created_at
		 FROM organization_users WHERE organization_id=$1 AND user_id=$2`,
		orgID, userID,
	).Scan(&u.ID, &u.OrganizationID, &u.UserID, &u.Role, &u.Status, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("organization user not found for org %s and user %s", orgID, userID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get organization user by org and user: %w", err)
	}
	return u, nil
}
