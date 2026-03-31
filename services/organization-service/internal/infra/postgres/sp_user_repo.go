package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/domain/repository"
)

type spUserRepo struct {
	db *sql.DB
}

func NewServiceProviderUserRepository(db *sql.DB) repository.ServiceProviderUserRepository {
	return &spUserRepo{db: db}
}

func (r *spUserRepo) Add(ctx context.Context, spUser *entity.ServiceProviderUser) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO service_provider_users (id, service_provider_id, user_id, role, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		spUser.ID, spUser.ServiceProviderID, spUser.UserID, spUser.Role, spUser.Status,
	)
	if err != nil {
		return fmt.Errorf("add sp user: %w", err)
	}
	return nil
}

func (r *spUserRepo) Remove(ctx context.Context, id, spID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM service_provider_users WHERE id = $1 AND service_provider_id = $2`, id, spID,
	)
	if err != nil {
		return fmt.Errorf("remove sp user: %w", err)
	}
	return nil
}

func (r *spUserRepo) GetByID(ctx context.Context, id string) (*entity.ServiceProviderUser, error) {
	var u entity.ServiceProviderUser
	err := r.db.QueryRowContext(ctx,
		`SELECT id, service_provider_id, user_id, role, status, created_at
		 FROM service_provider_users WHERE id = $1`, id,
	).Scan(&u.ID, &u.ServiceProviderID, &u.UserID, &u.Role, &u.Status, &u.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get sp user: %w", err)
	}
	return &u, nil
}

func (r *spUserRepo) ListBySP(ctx context.Context, spID string, limit, offset int) ([]entity.ServiceProviderUser, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM service_provider_users WHERE service_provider_id = $1`, spID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count sp users: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, service_provider_id, user_id, role, status, created_at
		 FROM service_provider_users WHERE service_provider_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, spID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list sp users: %w", err)
	}
	defer rows.Close()

	var users []entity.ServiceProviderUser
	for rows.Next() {
		var u entity.ServiceProviderUser
		if err := rows.Scan(&u.ID, &u.ServiceProviderID, &u.UserID, &u.Role, &u.Status, &u.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan sp user: %w", err)
		}
		users = append(users, u)
	}
	return users, total, rows.Err()
}

func (r *spUserRepo) GetBySPAndUser(ctx context.Context, spID, userID string) (*entity.ServiceProviderUser, error) {
	var u entity.ServiceProviderUser
	err := r.db.QueryRowContext(ctx,
		`SELECT id, service_provider_id, user_id, role, status, created_at
		 FROM service_provider_users WHERE service_provider_id = $1 AND user_id = $2`, spID, userID,
	).Scan(&u.ID, &u.ServiceProviderID, &u.UserID, &u.Role, &u.Status, &u.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get sp user by sp and user: %w", err)
	}
	return &u, nil
}

func (r *spUserRepo) UpdateRole(ctx context.Context, id, spID, role string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE service_provider_users SET role = $1 WHERE id = $2 AND service_provider_id = $3`,
		role, id, spID,
	)
	if err != nil {
		return fmt.Errorf("update sp user role: %w", err)
	}
	return nil
}

func (r *spUserRepo) UpdateStatus(ctx context.Context, id, spID, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE service_provider_users SET status = $1 WHERE id = $2 AND service_provider_id = $3`,
		status, id, spID,
	)
	if err != nil {
		return fmt.Errorf("update sp user status: %w", err)
	}
	return nil
}

func (r *spUserRepo) CountByRole(ctx context.Context, spID, role string) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM service_provider_users WHERE service_provider_id = $1 AND role = $2`,
		spID, role,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count sp users by role: %w", err)
	}
	return count, nil
}
