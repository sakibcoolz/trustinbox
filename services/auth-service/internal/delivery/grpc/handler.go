package grpchandler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/auth-service/internal/domain/entity"
	"github.com/trustinbox/auth-service/internal/domain/repository"
	"github.com/trustinbox/auth-service/internal/usecase"
	"github.com/trustinbox/cornerstone/auth/jwt"
	bzerr "github.com/trustinbox/cornerstone/errors"
	authv1 "github.com/trustinbox/proto/gen/auth/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthGRPCHandler struct {
	authv1.UnimplementedAuthServiceServer
	uc        *usecase.AuthUseCase
	tokenSvc  *jwt.TokenService
	tokenRepo repository.TokenRepository
}

func NewAuthGRPCHandler(uc *usecase.AuthUseCase, tokenSvc *jwt.TokenService, tokenRepo repository.TokenRepository) *AuthGRPCHandler {
	return &AuthGRPCHandler{
		uc:        uc,
		tokenSvc:  tokenSvc,
		tokenRepo: tokenRepo,
	}
}

func (h *AuthGRPCHandler) Login(ctx context.Context, req *authv1.LoginRequest) (*authv1.LoginResponse, error) {
	r, err := h.uc.Login(ctx, req.Email, req.Password)
	if err != nil {
		if bzerr.IsCode(err, bzerr.CodeUnauthorized) {
			return nil, status.Error(codes.Unauthenticated, err.Error())
		}
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &authv1.LoginResponse{
		AccessToken:  r.AccessToken,
		RefreshToken: r.RefreshToken,
		UserId:       r.UserID,
		ExpiresAt:    r.ExpiresAt,
	}, nil
}

func (h *AuthGRPCHandler) Register(ctx context.Context, req *authv1.RegisterRequest) (*authv1.RegisterResponse, error) {
	r, err := h.uc.Register(ctx, usecase.RegisterInput{
		Email:    req.Email,
		Mobile:   req.Mobile,
		Password: req.Password,
		FullName: req.FullName,
	})
	if err != nil {
		if bzerr.IsCode(err, bzerr.CodeAlreadyExists) {
			return nil, status.Error(codes.AlreadyExists, err.Error())
		}
		return nil, status.Error(codes.Internal, err.Error())
	}
	return &authv1.RegisterResponse{
		UserId:          r.UserID,
		VirtualPublicId: r.VirtualPublicID,
		AccessToken:     r.AccessToken,
		RefreshToken:    r.RefreshToken,
	}, nil
}

func (h *AuthGRPCHandler) RefreshToken(ctx context.Context, req *authv1.RefreshTokenRequest) (*authv1.RefreshTokenResponse, error) {
	userID, err := h.tokenSvc.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "invalid refresh token")
	}

	oldHash := hashToken(req.RefreshToken)
	stored, err := h.tokenRepo.GetByHash(ctx, oldHash)
	if err != nil || stored.Revoked {
		return nil, status.Error(codes.Unauthenticated, "refresh token not found or revoked")
	}

	if err := h.tokenRepo.Revoke(ctx, oldHash); err != nil {
		return nil, status.Error(codes.Internal, "failed to revoke old refresh token")
	}

	newAccessToken, err := h.tokenSvc.GenerateAccessToken(userID, "USER", "")
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to generate access token")
	}

	newRefreshToken, err := h.tokenSvc.GenerateRefreshToken(userID)
	if err != nil {
		return nil, status.Error(codes.Internal, "failed to generate refresh token")
	}

	newHash := hashToken(newRefreshToken)
	if err := h.tokenRepo.Store(ctx, &entity.RefreshToken{
		ID:        uuid.New().String(),
		UserID:    userID,
		TokenHash: newHash,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	}); err != nil {
		return nil, status.Error(codes.Internal, "failed to store refresh token")
	}

	return &authv1.RefreshTokenResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRefreshToken,
		ExpiresAt:    time.Now().Add(15 * time.Minute).Unix(),
	}, nil
}

func (h *AuthGRPCHandler) ValidateToken(ctx context.Context, req *authv1.ValidateTokenRequest) (*authv1.ValidateTokenResponse, error) {
	claims, err := h.tokenSvc.ValidateAccessToken(req.AccessToken)
	if err != nil {
		return &authv1.ValidateTokenResponse{Valid: false}, nil
	}
	return &authv1.ValidateTokenResponse{
		Valid:          true,
		UserId:         claims.UserID,
		Role:           claims.Role,
		OrganizationId: claims.ServiceProviderID,
	}, nil
}

func (h *AuthGRPCHandler) Logout(ctx context.Context, req *authv1.LogoutRequest) (*authv1.LogoutResponse, error) {
	tokenHash := hashToken(req.RefreshToken)
	if err := h.tokenRepo.Revoke(ctx, tokenHash); err != nil {
		return nil, status.Error(codes.Internal, "failed to revoke token")
	}
	return &authv1.LogoutResponse{Success: true}, nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
