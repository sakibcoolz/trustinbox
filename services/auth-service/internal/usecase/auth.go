package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/auth-service/internal/domain/entity"
	"github.com/trustinbox/auth-service/internal/domain/repository"
	"github.com/trustinbox/cornerstone/auth/jwt"
	bzerr "github.com/trustinbox/cornerstone/errors"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type AuthUseCase struct {
	userRepo  repository.UserRepository
	tokenRepo repository.TokenRepository
	tokenSvc  *jwt.TokenService
	log       *zap.Logger
}

func NewAuthUseCase(
	userRepo repository.UserRepository,
	tokenRepo repository.TokenRepository,
	tokenSvc *jwt.TokenService,
	log *zap.Logger,
) *AuthUseCase {
	return &AuthUseCase{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
		tokenSvc:  tokenSvc,
		log:       log,
	}
}

type LoginResult struct {
	AccessToken  string
	RefreshToken string
	UserID       string
	ExpiresAt    int64
}

func (uc *AuthUseCase) Login(ctx context.Context, email, password string) (*LoginResult, error) {
	user, err := uc.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, bzerr.Unauthorized("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, bzerr.Unauthorized("invalid credentials")
	}

	if user.Status != "ACTIVE" {
		return nil, bzerr.Unauthorized("account is not active")
	}

	accessToken, err := uc.tokenSvc.GenerateAccessToken(user.ID, "USER", "")
	if err != nil {
		return nil, bzerr.Internal("failed to generate access token", err)
	}

	refreshToken, err := uc.tokenSvc.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, bzerr.Internal("failed to generate refresh token", err)
	}

	// Store refresh token hash
	hash := hashToken(refreshToken)
	if err := uc.tokenRepo.Store(ctx, &entity.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}); err != nil {
		return nil, bzerr.Internal("failed to store refresh token", err)
	}

	return &LoginResult{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		UserID:       user.ID,
		ExpiresAt:    time.Now().Add(15 * time.Minute).Unix(),
	}, nil
}

type RegisterInput struct {
	Email    string
	Mobile   string
	Password string
	FullName string
}

type RegisterResult struct {
	UserID          string
	VirtualPublicID string
	AccessToken     string
	RefreshToken    string
}

func (uc *AuthUseCase) Register(ctx context.Context, input RegisterInput) (*RegisterResult, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, bzerr.Internal("failed to hash password", err)
	}

	userID := uuid.New().String()
	user := &entity.User{
		ID:           userID,
		Email:        input.Email,
		Mobile:       input.Mobile,
		PasswordHash: string(hash),
		Status:       "ACTIVE",
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, bzerr.Wrap(bzerr.CodeAlreadyExists, "user already exists", err)
	}

	accessToken, _ := uc.tokenSvc.GenerateAccessToken(userID, "USER", "")
	refreshToken, _ := uc.tokenSvc.GenerateRefreshToken(userID)

	tokenHash := hashToken(refreshToken)
	_ = uc.tokenRepo.Store(ctx, &entity.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	})

	return &RegisterResult{
		UserID:          userID,
		VirtualPublicID: "TI-" + userID[:8],
		AccessToken:     accessToken,
		RefreshToken:    refreshToken,
	}, nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
