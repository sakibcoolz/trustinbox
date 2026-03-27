package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/auth-service/internal/domain/entity"
	"github.com/trustinbox/auth-service/internal/domain/repository"
)

type userRepo struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) repository.UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*entity.User, error) {
	var u entity.User
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, mobile, password_hash, status, created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Email, &u.Mobile, &u.PasswordHash, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return &u, nil
}

func (r *userRepo) GetByID(ctx context.Context, id string) (*entity.User, error) {
	var u entity.User
	err := r.db.QueryRowContext(ctx,
		`SELECT id, email, mobile, password_hash, status, created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.Mobile, &u.PasswordHash, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return &u, nil
}

func (r *userRepo) Create(ctx context.Context, user *entity.User) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO users (id, email, mobile, password_hash, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
		user.ID, user.Email, user.Mobile, user.PasswordHash, user.Status,
	)
	return err
}
