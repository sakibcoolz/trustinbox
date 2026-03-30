package grpc

import (
	"context"

	"github.com/trustinbox/industry-service/internal/domain/entity"
	"github.com/trustinbox/industry-service/internal/usecase"
	bizerr "github.com/trustinbox/cornerstone/errors"
	pb "github.com/trustinbox/proto/gen/industry/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// IndustryProfileHandler implements the IndustryProfileServiceServer gRPC interface.
type IndustryProfileHandler struct {
	pb.UnimplementedIndustryProfileServiceServer
	uc *usecase.IndustryProfileUseCase
}

// NewIndustryProfileHandler creates a new IndustryProfileHandler.
func NewIndustryProfileHandler(uc *usecase.IndustryProfileUseCase) *IndustryProfileHandler {
	return &IndustryProfileHandler{uc: uc}
}

func (h *IndustryProfileHandler) GetIndustryProfile(ctx context.Context, req *pb.GetIndustryProfileRequest) (*pb.IndustryProfile, error) {
	profile, err := h.uc.GetIndustryProfile(ctx, req.GetIndustryKey())
	if err != nil {
		return nil, mapError(err)
	}
	return profileToProto(profile), nil
}

func (h *IndustryProfileHandler) ListIndustryProfiles(ctx context.Context, req *pb.ListIndustryProfilesRequest) (*pb.ListIndustryProfilesResponse, error) {
	profiles, total, err := h.uc.ListIndustryProfiles(ctx,
		req.GetActiveOnly(), int(req.GetLimit()), int(req.GetOffset()),
	)
	if err != nil {
		return nil, mapError(err)
	}
	pbProfiles := make([]*pb.IndustryProfile, len(profiles))
	for i, p := range profiles {
		pbProfiles[i] = profileToProto(p)
	}
	return &pb.ListIndustryProfilesResponse{Profiles: pbProfiles, Total: int32(total)}, nil
}

func (h *IndustryProfileHandler) CreateIndustryProfile(ctx context.Context, req *pb.CreateIndustryProfileRequest) (*pb.IndustryProfile, error) {
	profile, err := h.uc.CreateIndustryProfile(ctx,
		req.GetIndustryKey(), req.GetDisplayName(), req.GetDescription(),
		req.GetDefaultReasonCodesJson(), req.GetDefaultTemplatesJson(),
		req.GetDefaultCategories(),
		req.GetComplianceHintsJson(), req.GetDocumentTypesJson(),
		req.GetCallbackWorkflowsJson(), req.GetBotPromptPackJson(),
		req.GetDashboardPresetsJson(), req.GetAnalyticsPresetsJson(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return profileToProto(profile), nil
}

func (h *IndustryProfileHandler) UpdateIndustryProfile(ctx context.Context, req *pb.UpdateIndustryProfileRequest) (*pb.IndustryProfile, error) {
	profile, err := h.uc.UpdateIndustryProfile(ctx,
		req.GetIndustryKey(), req.GetDisplayName(), req.GetDescription(),
		req.GetDefaultReasonCodesJson(), req.GetDefaultTemplatesJson(),
		req.GetDefaultCategories(),
		req.GetComplianceHintsJson(), req.GetDocumentTypesJson(),
		req.GetCallbackWorkflowsJson(), req.GetBotPromptPackJson(),
		req.GetDashboardPresetsJson(), req.GetAnalyticsPresetsJson(),
		req.GetIsActive(),
	)
	if err != nil {
		return nil, mapError(err)
	}
	return profileToProto(profile), nil
}

func (h *IndustryProfileHandler) GetSeedProfiles(ctx context.Context, _ *pb.GetSeedProfilesRequest) (*pb.GetSeedProfilesResponse, error) {
	profiles := h.uc.GetSeedProfiles(ctx)
	pbProfiles := make([]*pb.IndustryProfile, len(profiles))
	for i, p := range profiles {
		pbProfiles[i] = profileToProto(p)
	}
	return &pb.GetSeedProfilesResponse{Profiles: pbProfiles}, nil
}

// --- Proto mapping helpers ---

func profileToProto(p *entity.IndustryProfile) *pb.IndustryProfile {
	return &pb.IndustryProfile{
		Id:                     p.ID,
		IndustryKey:            p.IndustryKey,
		DisplayName:            p.DisplayName,
		Description:            p.Description,
		DefaultReasonCodesJson: p.DefaultReasonCodes,
		DefaultTemplatesJson:   p.DefaultTemplates,
		DefaultCategories:      p.DefaultCategories,
		ComplianceHintsJson:    p.ComplianceHints,
		DocumentTypesJson:      p.DocumentTypes,
		CallbackWorkflowsJson:  p.CallbackWorkflows,
		BotPromptPackJson:      p.BotPromptPack,
		DashboardPresetsJson:   p.DashboardPresets,
		AnalyticsPresetsJson:   p.AnalyticsPresets,
		IsActive:               p.IsActive,
		CreatedAt:              timestamppb.New(p.CreatedAt),
		UpdatedAt:              timestamppb.New(p.UpdatedAt),
	}
}

// --- Error mapping ---

func mapError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case bizerr.IsNotFound(err):
		return status.Error(codes.NotFound, err.Error())
	case bizerr.IsInvalidInput(err):
		return status.Error(codes.InvalidArgument, err.Error())
	case bizerr.IsForbidden(err):
		return status.Error(codes.PermissionDenied, err.Error())
	case bizerr.IsCode(err, bizerr.CodeAlreadyExists):
		return status.Error(codes.AlreadyExists, err.Error())
	default:
		return status.Error(codes.Internal, err.Error())
	}
}
