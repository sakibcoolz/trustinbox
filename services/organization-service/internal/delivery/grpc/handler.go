package grpc

import (
	"context"

	orgv1 "github.com/trustinbox/proto/gen/organization/v1"
	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/usecase"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type OrgGRPCHandler struct {
	orgv1.UnimplementedServiceProviderServiceServer
	uc *usecase.OrgUseCase
}

func NewOrgGRPCHandler(uc *usecase.OrgUseCase) *OrgGRPCHandler {
	return &OrgGRPCHandler{uc: uc}
}

func (h *OrgGRPCHandler) CreateServiceProvider(ctx context.Context, req *orgv1.CreateServiceProviderRequest) (*orgv1.ServiceProvider, error) {
	org := &entity.Organization{
		Name:        req.GetName(),
		LegalName:   req.GetLegalName(),
		Industry:    req.GetIndustry(),
		Description: req.GetDescription(),
		Website:     req.GetWebsite(),
	}
	created, err := h.uc.CreateOrganization(ctx, org, req.GetAdminUserId())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create service provider: %v", err)
	}
	return orgToProto(created), nil
}

func (h *OrgGRPCHandler) GetServiceProvider(ctx context.Context, req *orgv1.GetServiceProviderRequest) (*orgv1.ServiceProvider, error) {
	org, err := h.uc.GetOrganization(ctx, req.GetServiceProviderId())
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "service provider not found: %v", err)
	}
	return orgToProto(org), nil
}

func (h *OrgGRPCHandler) ListServiceProviders(ctx context.Context, req *orgv1.ListServiceProvidersRequest) (*orgv1.ListServiceProvidersResponse, error) {
	orgs, total, err := h.uc.ListOrganizations(ctx,
		req.GetSearch(),
		req.GetVerificationStatus(),
		int(req.GetLimit()),
		int(req.GetOffset()),
	)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list service providers: %v", err)
	}

	providers := make([]*orgv1.ServiceProvider, 0, len(orgs))
	for i := range orgs {
		providers = append(providers, orgToProto(&orgs[i]))
	}
	return &orgv1.ListServiceProvidersResponse{
		ServiceProviders: providers,
		Total:            int32(total),
	}, nil
}

func (h *OrgGRPCHandler) UpdateServiceProvider(ctx context.Context, req *orgv1.UpdateServiceProviderRequest) (*orgv1.ServiceProvider, error) {
	org, err := h.uc.GetOrganization(ctx, req.GetServiceProviderId())
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "service provider not found: %v", err)
	}

	org.Name = req.GetName()
	org.LegalName = req.GetLegalName()
	org.Industry = req.GetIndustry()
	org.Description = req.GetDescription()
	org.Website = req.GetWebsite()

	if err := h.uc.UpdateOrganization(ctx, org); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update service provider: %v", err)
	}
	return orgToProto(org), nil
}

func (h *OrgGRPCHandler) VerifyServiceProvider(ctx context.Context, req *orgv1.VerifyServiceProviderRequest) (*orgv1.VerifyServiceProviderResponse, error) {
	if err := h.uc.VerifyOrganization(ctx,
		req.GetServiceProviderId(),
		req.GetDecision(),
		req.GetReason(),
		req.GetAdminUserId(),
	); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to verify service provider: %v", err)
	}
	return &orgv1.VerifyServiceProviderResponse{Success: true}, nil
}

func (h *OrgGRPCHandler) SuspendServiceProvider(ctx context.Context, req *orgv1.SuspendServiceProviderRequest) (*orgv1.SuspendServiceProviderResponse, error) {
	if err := h.uc.SuspendOrganization(ctx,
		req.GetServiceProviderId(),
		req.GetReason(),
		req.GetAdminUserId(),
	); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to suspend service provider: %v", err)
	}
	return &orgv1.SuspendServiceProviderResponse{Success: true}, nil
}

func (h *OrgGRPCHandler) AddServiceProviderUser(ctx context.Context, req *orgv1.AddServiceProviderUserRequest) (*orgv1.ServiceProviderUser, error) {
	orgUser := &entity.OrganizationUser{
		OrganizationID: req.GetServiceProviderId(),
		UserID:         req.GetUserId(),
		Role:           req.GetRole(),
	}
	added, err := h.uc.AddOrgUser(ctx, orgUser)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to add service provider user: %v", err)
	}
	return orgUserToProto(added), nil
}

func (h *OrgGRPCHandler) RemoveServiceProviderUser(ctx context.Context, req *orgv1.RemoveServiceProviderUserRequest) (*orgv1.RemoveServiceProviderUserResponse, error) {
	if err := h.uc.RemoveOrgUser(ctx, req.GetServiceProviderUserId(), req.GetServiceProviderId()); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to remove service provider user: %v", err)
	}
	return &orgv1.RemoveServiceProviderUserResponse{Success: true}, nil
}

func (h *OrgGRPCHandler) ListServiceProviderUsers(ctx context.Context, req *orgv1.ListServiceProviderUsersRequest) (*orgv1.ListServiceProviderUsersResponse, error) {
	users, total, err := h.uc.ListOrgUsers(ctx,
		req.GetServiceProviderId(),
		int(req.GetLimit()),
		int(req.GetOffset()),
	)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list service provider users: %v", err)
	}

	protoUsers := make([]*orgv1.ServiceProviderUser, 0, len(users))
	for i := range users {
		protoUsers = append(protoUsers, orgUserToProto(&users[i]))
	}
	return &orgv1.ListServiceProviderUsersResponse{
		Users: protoUsers,
		Total: int32(total),
	}, nil
}

func (h *OrgGRPCHandler) GetServiceProviderUser(ctx context.Context, req *orgv1.GetServiceProviderUserRequest) (*orgv1.ServiceProviderUser, error) {
	u, err := h.uc.GetOrgUser(ctx, req.GetServiceProviderUserId())
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "service provider user not found: %v", err)
	}
	return orgUserToProto(u), nil
}

func orgToProto(org *entity.Organization) *orgv1.ServiceProvider {
	return &orgv1.ServiceProvider{
		Id:                 org.ID,
		Name:               org.Name,
		LegalName:          org.LegalName,
		Industry:           org.Industry,
		Description:        org.Description,
		VerificationStatus: org.VerificationStatus,
		Status:             org.Status,
		Website:            org.Website,
		CreatedAt:          timestamppb.New(org.CreatedAt),
		UpdatedAt:          timestamppb.New(org.UpdatedAt),
	}
}

func orgUserToProto(u *entity.OrganizationUser) *orgv1.ServiceProviderUser {
	return &orgv1.ServiceProviderUser{
		Id:                u.ID,
		ServiceProviderId: u.OrganizationID,
		UserId:            u.UserID,
		Role:              u.Role,
		Status:            u.Status,
		CreatedAt:         timestamppb.New(u.CreatedAt),
	}
}
