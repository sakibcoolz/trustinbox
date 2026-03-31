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
	var username sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, username, email, mobile, password_hash, status, created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &username, &u.Email, &u.Mobile, &u.PasswordHash, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	if username.Valid {
		u.Username = username.String
	}
	return &u, nil
}

func (r *userRepo) GetByID(ctx context.Context, id string) (*entity.User, error) {
	var u entity.User
	var username sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, username, email, mobile, password_hash, status, created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &username, &u.Email, &u.Mobile, &u.PasswordHash, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	if username.Valid {
		u.Username = username.String
	}
	return &u, nil
}

func (r *userRepo) GetByUsername(ctx context.Context, username string) (*entity.User, error) {
	var u entity.User
	var uname sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, username, email, mobile, password_hash, status, created_at, updated_at
		 FROM users WHERE username = $1`, username,
	).Scan(&u.ID, &uname, &u.Email, &u.Mobile, &u.PasswordHash, &u.Status, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	if uname.Valid {
		u.Username = uname.String
	}
	return &u, nil
}

func (r *userRepo) Create(ctx context.Context, user *entity.User) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO users (id, username, email, mobile, password_hash, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
		user.ID, user.Username, user.Email, user.Mobile, user.PasswordHash, user.Status,
	)
	return err
}

func (r *userRepo) UpdateUsername(ctx context.Context, userID, username string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2`,
		username, userID,
	)
	if err != nil {
		return fmt.Errorf("update username: %w", err)
	}
	return nil
}

func (r *userRepo) UsernameExists(ctx context.Context, username string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)`, username,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check username exists: %w", err)
	}
	return exists, nil
}
