package grpc

import (
	"context"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/organization-service/internal/usecase"
	pb "github.com/trustinbox/proto/gen/organization/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// OrganizationHandler implements the OrganizationService gRPC server.
type OrganizationHandler struct {
	pb.UnimplementedOrganizationServiceServer
	uc *usecase.OrgUseCase
}

// NewOrganizationHandler creates a new OrganizationHandler.
func NewOrganizationHandler(uc *usecase.OrgUseCase) *OrganizationHandler {
	return &OrganizationHandler{uc: uc}
}

func (h *OrganizationHandler) CreateOrganization(ctx context.Context, req *pb.CreateOrganizationRequest) (*pb.CreateOrganizationResponse, error) {
	org, err := h.uc.CreateOrganization(ctx, req.Name, req.Email, req.Phone, req.Industry)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.CreateOrganizationResponse{
		OrganizationId: org.ID,
	}, nil
}

func (h *OrganizationHandler) GetOrganization(ctx context.Context, req *pb.GetOrganizationRequest) (*pb.Organization, error) {
	org, err := h.uc.GetOrganization(ctx, req.OrganizationId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.Organization{
		Id:               org.ID,
		Name:             org.Name,
		Email:            org.Email,
		Phone:            org.Phone,
		Industry:         org.Industry,
		VerificationStatus: org.VerificationStatus,
		Status:           org.Status,
	}, nil
}

func (h *OrganizationHandler) ListOrganizations(ctx context.Context, req *pb.ListOrganizationsRequest) (*pb.ListOrganizationsResponse, error) {
	orgs, total, err := h.uc.ListOrganizations(ctx, int(req.Limit), int(req.Offset))
	if err != nil {
		return nil, mapError(err)
	}
	pbOrgs := make([]*pb.Organization, len(orgs))
	for i, o := range orgs {
		pbOrgs[i] = &pb.Organization{
			Id:                 o.ID,
			Name:               o.Name,
			Email:              o.Email,
			Phone:              o.Phone,
			Industry:           o.Industry,
			VerificationStatus: o.VerificationStatus,
			Status:             o.Status,
		}
	}
	return &pb.ListOrganizationsResponse{
		Organizations: pbOrgs,
		Total:         int32(total),
	}, nil
}

func (h *OrganizationHandler) VerifyOrganization(ctx context.Context, req *pb.VerifyOrganizationRequest) (*pb.VerifyOrganizationResponse, error) {
	err := h.uc.VerifyOrganization(ctx, req.OrganizationId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.VerifyOrganizationResponse{Success: true}, nil
}

func (h *OrganizationHandler) SuspendOrganization(ctx context.Context, req *pb.SuspendOrganizationRequest) (*pb.SuspendOrganizationResponse, error) {
	err := h.uc.SuspendOrganization(ctx, req.OrganizationId, req.Reason)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.SuspendOrganizationResponse{Success: true}, nil
}

func (h *OrganizationHandler) AddOrgUser(ctx context.Context, req *pb.AddOrgUserRequest) (*pb.AddOrgUserResponse, error) {
	err := h.uc.AddOrgUser(ctx, req.OrganizationId, req.UserId, req.Role)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.AddOrgUserResponse{Success: true}, nil
}

func (h *OrganizationHandler) ListOrgUsers(ctx context.Context, req *pb.ListOrgUsersRequest) (*pb.ListOrgUsersResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *OrganizationHandler) UpdateOrganization(ctx context.Context, req *pb.UpdateOrganizationRequest) (*pb.Organization, error) {
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
