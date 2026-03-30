package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/auth-service/internal/domain/entity"
	"github.com/trustinbox/auth-service/internal/domain/repository"
)

type tokenRepo struct {
	db *sql.DB
}

func NewTokenRepository(db *sql.DB) repository.TokenRepository {
	return &tokenRepo{db: db}
}

func (r *tokenRepo) Store(ctx context.Context, token *entity.RefreshToken) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		token.ID, token.UserID, token.TokenHash, token.ExpiresAt, token.Revoked,
	)
	if err != nil {
		return fmt.Errorf("store refresh token: %w", err)
	}
	return nil
}

func (r *tokenRepo) GetByHash(ctx context.Context, tokenHash string) (*entity.RefreshToken, error) {
	var t entity.RefreshToken
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, token_hash, expires_at, revoked, created_at
		 FROM refresh_tokens WHERE token_hash = $1`, tokenHash,
	).Scan(&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.Revoked, &t.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get refresh token: %w", err)
	}
	return &t, nil
}

func (r *tokenRepo) Revoke(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`, tokenHash,
	)
	if err != nil {
		return fmt.Errorf("revoke refresh token: %w", err)
	}
	return nil
}

func (r *tokenRepo) RevokeAllForUser(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`, userID,
	)
	if err != nil {
		return fmt.Errorf("revoke all refresh tokens: %w", err)
	}
	return nil
}
