package grpc

import (
	"context"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/usecase"
	pb "github.com/trustinbox/proto/gen/organization/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ServiceProviderHandler implements the ServiceProviderService gRPC server.
type ServiceProviderHandler struct {
	pb.UnimplementedServiceProviderServiceServer
	uc *usecase.SPUseCase
}

// NewServiceProviderHandler creates a new ServiceProviderHandler.
func NewServiceProviderHandler(uc *usecase.SPUseCase) *ServiceProviderHandler {
	return &ServiceProviderHandler{uc: uc}
}

func (h *ServiceProviderHandler) CreateServiceProvider(ctx context.Context, req *pb.CreateServiceProviderRequest) (*pb.ServiceProvider, error) {
	sp, err := h.uc.CreateServiceProvider(ctx, &entity.ServiceProvider{
		Name:        req.Name,
		LegalName:   req.LegalName,
		Industry:    req.Industry,
		Description: req.Description,
		Website:     req.Website,
	}, req.AdminUserId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.ServiceProvider{
		Id:                 sp.ID,
		Name:               sp.Name,
		LegalName:          sp.LegalName,
		Industry:           sp.Industry,
		Description:        sp.Description,
		VerificationStatus: sp.VerificationStatus,
		Status:             sp.Status,
		Website:            sp.Website,
	}, nil
}

func (h *ServiceProviderHandler) GetServiceProvider(ctx context.Context, req *pb.GetServiceProviderRequest) (*pb.ServiceProvider, error) {
	sp, err := h.uc.GetServiceProvider(ctx, req.ServiceProviderId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.ServiceProvider{
		Id:                 sp.ID,
		Name:               sp.Name,
		LegalName:          sp.LegalName,
		Industry:           sp.Industry,
		Description:        sp.Description,
		VerificationStatus: sp.VerificationStatus,
		Status:             sp.Status,
		Website:            sp.Website,
	}, nil
}

func (h *ServiceProviderHandler) ListServiceProviders(ctx context.Context, req *pb.ListServiceProvidersRequest) (*pb.ListServiceProvidersResponse, error) {
	sps, total, err := h.uc.ListServiceProviders(ctx, req.Search, req.VerificationStatus, int(req.Limit), int(req.Offset))
	if err != nil {
		return nil, mapError(err)
	}
	pbSPs := make([]*pb.ServiceProvider, len(sps))
	for i, sp := range sps {
		pbSPs[i] = &pb.ServiceProvider{
			Id:                 sp.ID,
			Name:               sp.Name,
			LegalName:          sp.LegalName,
			Industry:           sp.Industry,
			Description:        sp.Description,
			VerificationStatus: sp.VerificationStatus,
			Status:             sp.Status,
			Website:            sp.Website,
		}
	}
	return &pb.ListServiceProvidersResponse{
		ServiceProviders: pbSPs,
		Total:            int32(total),
	}, nil
}

func (h *ServiceProviderHandler) UpdateServiceProvider(ctx context.Context, req *pb.UpdateServiceProviderRequest) (*pb.ServiceProvider, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *ServiceProviderHandler) VerifyServiceProvider(ctx context.Context, req *pb.VerifyServiceProviderRequest) (*pb.VerifyServiceProviderResponse, error) {
	err := h.uc.VerifyServiceProvider(ctx, req.ServiceProviderId, req.Decision, req.Reason, req.AdminUserId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.VerifyServiceProviderResponse{Success: true}, nil
}

func (h *ServiceProviderHandler) SuspendServiceProvider(ctx context.Context, req *pb.SuspendServiceProviderRequest) (*pb.SuspendServiceProviderResponse, error) {
	err := h.uc.SuspendServiceProvider(ctx, req.ServiceProviderId, req.Reason, req.AdminUserId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.SuspendServiceProviderResponse{Success: true}, nil
}

func (h *ServiceProviderHandler) AddServiceProviderUser(ctx context.Context, req *pb.AddServiceProviderUserRequest) (*pb.ServiceProviderUser, error) {
	spUser, err := h.uc.AddSPUser(ctx, &entity.ServiceProviderUser{
		ServiceProviderID: req.ServiceProviderId,
		UserID:            req.UserId,
		Role:              req.Role,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.ServiceProviderUser{
		Id:                spUser.ID,
		ServiceProviderId: spUser.ServiceProviderID,
		UserId:            spUser.UserID,
		Role:              spUser.Role,
		Status:            spUser.Status,
	}, nil
}

func (h *ServiceProviderHandler) RemoveServiceProviderUser(ctx context.Context, req *pb.RemoveServiceProviderUserRequest) (*pb.RemoveServiceProviderUserResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *ServiceProviderHandler) ListServiceProviderUsers(ctx context.Context, req *pb.ListServiceProviderUsersRequest) (*pb.ListServiceProviderUsersResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *ServiceProviderHandler) GetServiceProviderUser(ctx context.Context, req *pb.GetServiceProviderUserRequest) (*pb.ServiceProviderUser, error) {
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
	default:
		return status.Errorf(codes.Internal, err.Error())
	}
}
