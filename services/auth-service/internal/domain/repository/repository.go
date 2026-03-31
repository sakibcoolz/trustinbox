package repository

import (
	"context"

	"github.com/trustinbox/auth-service/internal/domain/entity"
)

type UserRepository interface {
	GetByEmail(ctx context.Context, email string) (*entity.User, error)
	GetByID(ctx context.Context, id string) (*entity.User, error)
	GetByUsername(ctx context.Context, username string) (*entity.User, error)
	Create(ctx context.Context, user *entity.User) error
	UpdateUsername(ctx context.Context, userID, username string) error
	UsernameExists(ctx context.Context, username string) (bool, error)
}

type TokenRepository interface {
	Store(ctx context.Context, token *entity.RefreshToken) error
	GetByHash(ctx context.Context, tokenHash string) (*entity.RefreshToken, error)
	Revoke(ctx context.Context, tokenHash string) error
	RevokeAllForUser(ctx context.Context, userID string) error
}
