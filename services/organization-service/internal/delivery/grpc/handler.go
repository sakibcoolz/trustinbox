package grpc

import (
	"context"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/usecase"
	pb "github.com/trustinbox/proto/gen/organization/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ServiceProviderHandler implements the ServiceProviderService gRPC server.
type ServiceProviderHandler struct {
	pb.UnimplementedServiceProviderServiceServer
	uc     *usecase.SPUseCase
	teamUC *usecase.TeamUseCase
}

// NewServiceProviderHandler creates a new ServiceProviderHandler.
func NewServiceProviderHandler(uc *usecase.SPUseCase, teamUC *usecase.TeamUseCase) *ServiceProviderHandler {
	return &ServiceProviderHandler{uc: uc, teamUC: teamUC}
}

func (h *ServiceProviderHandler) CreateServiceProvider(ctx context.Context, req *pb.CreateServiceProviderRequest) (*pb.ServiceProvider, error) {
	sp, err := h.uc.CreateServiceProvider(ctx, &entity.ServiceProvider{
		Name:        req.Name,
		LegalName:   req.LegalName,
		Industry:    req.Industry,
		Description: req.Description,
		Website:     req.Website,
		ServiceMode: req.ServiceMode,
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
		ServiceMode:        sp.ServiceMode,
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
		ServiceMode:        sp.ServiceMode,
	}, nil
}

func (h *ServiceProviderHandler) ListServiceProviders(ctx context.Context, req *pb.ListServiceProvidersRequest) (*pb.ListServiceProvidersResponse, error) {
	sps, total, err := h.uc.ListServiceProviders(ctx, req.Search, req.VerificationStatus, req.ServiceMode, int(req.Limit), int(req.Offset))
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
			ServiceMode:        sp.ServiceMode,
		}
	}
	return &pb.ListServiceProvidersResponse{
		ServiceProviders: pbSPs,
		Total:            int32(total),
	}, nil
}

func (h *ServiceProviderHandler) UpdateServiceProvider(ctx context.Context, req *pb.UpdateServiceProviderRequest) (*pb.ServiceProvider, error) {
	sp, err := h.uc.UpdateServiceProvider(ctx, &entity.ServiceProvider{
		ID:          req.ServiceProviderId,
		Name:        req.Name,
		LegalName:   req.LegalName,
		Industry:    req.Industry,
		Description: req.Description,
		Website:     req.Website,
		ServiceMode: req.ServiceMode,
	})
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
		ServiceMode:        sp.ServiceMode,
	}, nil
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
	err := h.teamUC.RemoveTeamMember(ctx, usecase.RemoveMemberInput{
		TargetUserID:      req.ServiceProviderUserId,
		ServiceProviderID: req.ServiceProviderId,
		ActorUserID:       "", // legacy RPC, no actor context
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.RemoveServiceProviderUserResponse{Success: true}, nil
}

func (h *ServiceProviderHandler) ListServiceProviderUsers(ctx context.Context, req *pb.ListServiceProviderUsersRequest) (*pb.ListServiceProviderUsersResponse, error) {
	users, total, err := h.teamUC.ListTeamMembers(ctx, req.ServiceProviderId, int(req.Limit), int(req.Offset))
	if err != nil {
		return nil, mapError(err)
	}
	pbUsers := make([]*pb.ServiceProviderUser, len(users))
	for i, u := range users {
		pbUsers[i] = &pb.ServiceProviderUser{
			Id:                u.ID,
			ServiceProviderId: u.ServiceProviderID,
			UserId:            u.UserID,
			Role:              u.Role,
			Status:            u.Status,
		}
	}
	return &pb.ListServiceProviderUsersResponse{Users: pbUsers, Total: int32(total)}, nil
}

func (h *ServiceProviderHandler) GetServiceProviderUser(ctx context.Context, req *pb.GetServiceProviderUserRequest) (*pb.ServiceProviderUser, error) {
	u, err := h.uc.GetSPUserByID(ctx, req.ServiceProviderUserId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.ServiceProviderUser{
		Id:                u.ID,
		ServiceProviderId: u.ServiceProviderID,
		UserId:            u.UserID,
		Role:              u.Role,
		Status:            u.Status,
	}, nil
}

// --- Invitation & Team Management RPCs ---

func (h *ServiceProviderHandler) InviteTeamMember(ctx context.Context, req *pb.InviteTeamMemberRequest) (*pb.InviteTeamMemberResponse, error) {
	result, err := h.teamUC.InviteUser(ctx, usecase.InviteInput{
		Email:             req.Email,
		Role:              req.Role,
		ServiceProviderID: req.ServiceProviderId,
		InvitedByUserID:   req.InvitedByUserId,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.InviteTeamMemberResponse{
		InvitationId: result.InvitationID,
		Token:        result.Token,
	}, nil
}

func (h *ServiceProviderHandler) AcceptInvitation(ctx context.Context, req *pb.AcceptInvitationRequest) (*pb.AcceptInvitationResponse, error) {
	err := h.teamUC.AcceptInvitation(ctx, usecase.AcceptInvitationInput{
		Token:  req.Token,
		UserID: req.UserId,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.AcceptInvitationResponse{Success: true}, nil
}

func (h *ServiceProviderHandler) RevokeInvitation(ctx context.Context, req *pb.RevokeInvitationRequest) (*pb.RevokeInvitationResponse, error) {
	err := h.teamUC.RevokeInvitation(ctx, req.InvitationId, req.ActorUserId, req.ServiceProviderId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.RevokeInvitationResponse{Success: true}, nil
}

func (h *ServiceProviderHandler) ListInvitations(ctx context.Context, req *pb.ListInvitationsRequest) (*pb.ListInvitationsResponse, error) {
	invitations, total, err := h.teamUC.ListInvitations(ctx, req.ServiceProviderId, req.Status, int(req.Limit), int(req.Offset))
	if err != nil {
		return nil, mapError(err)
	}
	pbInvitations := make([]*pb.Invitation, len(invitations))
	for i, inv := range invitations {
		pbInvitations[i] = &pb.Invitation{
			Id:                inv.ID,
			Email:             inv.Email,
			ServiceProviderId: inv.ServiceProviderID,
			Role:              inv.Role,
			Status:            inv.Status,
			InvitedBy:         inv.InvitedBy,
			ExpiresAt:         timestamppb.New(inv.ExpiresAt),
			CreatedAt:         timestamppb.New(inv.CreatedAt),
		}
	}
	return &pb.ListInvitationsResponse{Invitations: pbInvitations, Total: int32(total)}, nil
}

func (h *ServiceProviderHandler) ChangeTeamMemberRole(ctx context.Context, req *pb.ChangeTeamMemberRoleRequest) (*pb.ChangeTeamMemberRoleResponse, error) {
	err := h.teamUC.ChangeUserRole(ctx, usecase.ChangeRoleInput{
		TargetUserID:      req.TargetUserId,
		ServiceProviderID: req.ServiceProviderId,
		NewRole:           req.NewRole,
		ActorUserID:       req.ActorUserId,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.ChangeTeamMemberRoleResponse{Success: true}, nil
}

func (h *ServiceProviderHandler) RemoveTeamMember(ctx context.Context, req *pb.RemoveTeamMemberRequest) (*pb.RemoveTeamMemberResponse, error) {
	err := h.teamUC.RemoveTeamMember(ctx, usecase.RemoveMemberInput{
		TargetUserID:      req.TargetUserId,
		ServiceProviderID: req.ServiceProviderId,
		ActorUserID:       req.ActorUserId,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.RemoveTeamMemberResponse{Success: true}, nil
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
