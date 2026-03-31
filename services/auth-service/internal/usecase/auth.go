package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/auth-service/internal/domain/entity"
	"github.com/trustinbox/auth-service/internal/domain/repository"
	"github.com/trustinbox/cornerstone/auth/jwt"
	"github.com/trustinbox/cornerstone/auth/username"
	bzerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type AuthUseCase struct {
	userRepo  repository.UserRepository
	tokenRepo repository.TokenRepository
	tokenSvc  *jwt.TokenService
	publisher events.Publisher
	log       *zap.Logger
}

func NewAuthUseCase(
	userRepo repository.UserRepository,
	tokenRepo repository.TokenRepository,
	tokenSvc *jwt.TokenService,
	publisher events.Publisher,
	log *zap.Logger,
) *AuthUseCase {
	return &AuthUseCase{
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
		tokenSvc:  tokenSvc,
		publisher: publisher,
		log:       log,
	}
}

type LoginResult struct {
	AccessToken  string
	RefreshToken string
	UserID       string
	Username     string
	Role         string
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

	role := "CUSTOMER"
	accessToken, err := uc.tokenSvc.GenerateAccessToken(user.ID, role, "")
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
		Username:     user.Username,
		Role:         role,
		ExpiresAt:    time.Now().Add(15 * time.Minute).Unix(),
	}, nil
}

type RegisterInput struct {
	Username string
	Email    string
	Mobile   string
	Password string
	FullName string
}

type RegisterResult struct {
	UserID          string
	Username        string
	VirtualPublicID string
	AccessToken     string
	RefreshToken    string
}

func (uc *AuthUseCase) Register(ctx context.Context, input RegisterInput) (*RegisterResult, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, bzerr.Internal("failed to hash password", err)
	}

	// Generate username if not provided
	uname := input.Username
	if uname == "" {
		uname = username.GenerateCustomerUsername(input.Email)
	}

	// Validate username format
	if err := username.Validate(uname); err != nil {
		return nil, bzerr.InvalidInput(fmt.Sprintf("invalid username: %s", err.Error()))
	}

	// Resolve uniqueness conflicts by appending suffix
	resolvedName, err := uc.resolveUniqueUsername(ctx, uname)
	if err != nil {
		return nil, bzerr.Internal("failed to resolve username", err)
	}

	userID := uuid.New().String()
	user := &entity.User{
		ID:           userID,
		Username:     resolvedName,
		Email:        input.Email,
		Mobile:       input.Mobile,
		PasswordHash: string(hash),
		Status:       "ACTIVE",
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, bzerr.Wrap(bzerr.CodeAlreadyExists, "user already exists", err)
	}

	accessToken, _ := uc.tokenSvc.GenerateAccessToken(userID, "CUSTOMER", "")
	refreshToken, _ := uc.tokenSvc.GenerateRefreshToken(userID)

	tokenHash := hashToken(refreshToken)
	_ = uc.tokenRepo.Store(ctx, &entity.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	})

	// Publish customer.synced event (new user registration)
	uc.publishEvent(ctx, events.CustomerSynced, userID, map[string]interface{}{
		"user_id":  userID,
		"username": resolvedName,
		"email":    input.Email,
	})

	return &RegisterResult{
		UserID:          userID,
		Username:        resolvedName,
		VirtualPublicID: "TI-" + userID[:8],
		AccessToken:     accessToken,
		RefreshToken:    refreshToken,
	}, nil
}

// resolveUniqueUsername tries the base username, then appends -2, -3, etc. on conflict.
func (uc *AuthUseCase) resolveUniqueUsername(ctx context.Context, base string) (string, error) {
	candidate := base
	for i := 2; i <= 100; i++ {
		exists, err := uc.userRepo.UsernameExists(ctx, candidate)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
		candidate = username.AppendSuffix(base, i)
	}
	return "", fmt.Errorf("could not resolve unique username for %s", base)
}

// ChangeUsername changes a user's username (admin-only, audit logged).
func (uc *AuthUseCase) ChangeUsername(ctx context.Context, adminUserID, targetUserID, newUsername string) error {
	if err := username.Validate(newUsername); err != nil {
		return bzerr.InvalidInput(fmt.Sprintf("invalid username: %s", err.Error()))
	}

	exists, err := uc.userRepo.UsernameExists(ctx, newUsername)
	if err != nil {
		return bzerr.Internal("failed to check username", err)
	}
	if exists {
		return bzerr.Wrap(bzerr.CodeAlreadyExists, "username already taken", nil)
	}

	if err := uc.userRepo.UpdateUsername(ctx, targetUserID, newUsername); err != nil {
		return bzerr.Internal("failed to update username", err)
	}

	uc.log.Info("username changed",
		zap.String("admin_user_id", adminUserID),
		zap.String("target_user_id", targetUserID),
		zap.String("new_username", newUsername),
	)

	return nil
}

// publishEvent fires a domain event asynchronously.
func (uc *AuthUseCase) publishEvent(ctx context.Context, eventType events.EventType, userID string, payload interface{}) {
	if uc.publisher == nil {
		return
	}
	evt, err := events.NewEvent(eventType, payload)
	if err != nil {
		uc.log.Error("failed to create event", zap.String("event_type", string(eventType)), zap.Error(err))
		return
	}
	evt.WithUser(userID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish event", zap.String("event_type", string(eventType)), zap.Error(err))
	}
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func (uc *AuthUseCase) RefreshToken(ctx context.Context, refreshToken string) (*LoginResult, error) {
	// Validate the refresh token JWT signature and expiry
	userID, err := uc.tokenSvc.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, bzerr.Unauthorized("invalid or expired refresh token")
	}

	// Verify the token hash exists in DB and is not revoked
	hash := hashToken(refreshToken)
	stored, err := uc.tokenRepo.GetByHash(ctx, hash)
	if err != nil {
		return nil, bzerr.Unauthorized("refresh token not found")
	}
	if stored.Revoked {
		return nil, bzerr.Unauthorized("refresh token has been revoked")
	}
	if stored.ExpiresAt.Before(time.Now()) {
		return nil, bzerr.Unauthorized("refresh token expired")
	}

	// Revoke the old refresh token (rotate)
	_ = uc.tokenRepo.Revoke(ctx, hash)

	// Look up the user to get current role info
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, bzerr.Unauthorized("user not found")
	}
	if user.Status != "ACTIVE" {
		return nil, bzerr.Unauthorized("account is not active")
	}

	// Generate new token pair
	newAccess, err := uc.tokenSvc.GenerateAccessToken(user.ID, "CUSTOMER", "")
	if err != nil {
		return nil, bzerr.Internal("failed to generate access token", err)
	}
	newRefresh, err := uc.tokenSvc.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, bzerr.Internal("failed to generate refresh token", err)
	}

	// Store the new refresh token hash
	newHash := hashToken(newRefresh)
	if err := uc.tokenRepo.Store(ctx, &entity.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    user.ID,
		TokenHash: newHash,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}); err != nil {
		return nil, bzerr.Internal("failed to store refresh token", err)
	}

	return &LoginResult{
		AccessToken:  newAccess,
		RefreshToken: newRefresh,
		UserID:       user.ID,
		ExpiresAt:    time.Now().Add(15 * time.Minute).Unix(),
	}, nil
}
