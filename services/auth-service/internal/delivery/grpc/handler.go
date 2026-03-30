package grpc

import (
	"context"

	"github.com/trustinbox/auth-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	pb "github.com/trustinbox/proto/gen/auth/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// AuthHandler implements the AuthService gRPC server.
type AuthHandler struct {
	pb.UnimplementedAuthServiceServer
	uc *usecase.AuthUseCase
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(uc *usecase.AuthUseCase) *AuthHandler {
	return &AuthHandler{uc: uc}
}

func (h *AuthHandler) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	result, err := h.uc.Login(ctx, req.Email, req.Password)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.LoginResponse{
		AccessToken:  result.AccessToken,
		RefreshToken: result.RefreshToken,
		UserId:       result.UserID,
		ExpiresAt:    result.ExpiresAt,
	}, nil
}

func (h *AuthHandler) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	result, err := h.uc.Register(ctx, usecase.RegisterInput{
		Email:    req.Email,
		Mobile:   req.Mobile,
		Password: req.Password,
		FullName: req.FullName,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.RegisterResponse{
		UserId:          result.UserID,
		VirtualPublicId: result.VirtualPublicID,
		AccessToken:     result.AccessToken,
		RefreshToken:    result.RefreshToken,
	}, nil
}

func (h *AuthHandler) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *AuthHandler) ValidateToken(ctx context.Context, req *pb.ValidateTokenRequest) (*pb.ValidateTokenResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *AuthHandler) Logout(ctx context.Context, req *pb.LogoutRequest) (*pb.LogoutResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func mapError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case bizerr.IsNotFound(err):
		return status.Errorf(codes.NotFound, err.Error())
	case bizerr.IsInvalidInput(err):
		return status.Errorf(codes.InvalidArgument, err.Error())
	case bizerr.IsForbidden(err):
		return status.Errorf(codes.PermissionDenied, err.Error())
	case bizerr.IsUnauthorized(err):
		return status.Errorf(codes.Unauthenticated, err.Error())
	default:
		return status.Errorf(codes.Internal, err.Error())
	}
}
