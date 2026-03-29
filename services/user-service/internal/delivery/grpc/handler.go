package grpc

import (
	"context"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/user-service/internal/usecase"
	pb "github.com/trustinbox/proto/gen/user/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// UserHandler implements the UserService gRPC server.
type UserHandler struct {
	pb.UnimplementedUserServiceServer
	uc *usecase.UserUseCase
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(uc *usecase.UserUseCase) *UserHandler {
	return &UserHandler{uc: uc}
}

func (h *UserHandler) GetUserProfile(ctx context.Context, req *pb.GetUserProfileRequest) (*pb.GetUserProfileResponse, error) {
	profile, err := h.uc.GetProfile(ctx, req.UserId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.GetUserProfileResponse{
		UserId:          profile.UserID,
		Username:        profile.Username,
		FullName:        profile.FullName,
		Email:           profile.Email,
		VirtualPublicId: profile.VirtualPublicID,
		AvatarUrl:       profile.AvatarURL,
		Timezone:        profile.Timezone,
		Language:        profile.Language,
		Status:          profile.Status,
	}, nil
}

func (h *UserHandler) UpdateUserProfile(ctx context.Context, req *pb.UpdateUserProfileRequest) (*pb.UpdateUserProfileResponse, error) {
	// TODO: implement when use case supports it
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *UserHandler) GetPrivacyPreference(ctx context.Context, req *pb.GetPrivacyPreferenceRequest) (*pb.PrivacyPreference, error) {
	// TODO: implement get privacy preferences
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *UserHandler) UpdatePrivacyPreference(ctx context.Context, req *pb.UpdatePrivacyPreferenceRequest) (*pb.PrivacyPreference, error) {
	pref, err := h.uc.UpdatePrivacyPreference(ctx, req.UserId, toPrefMap(req))
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.PrivacyPreference{
		UserId:                     pref.UserID,
		AllowPersonalNotifications: pref.AllowPersonalNotifications,
		AllowOrgNotifications:      pref.AllowOrgNotifications,
		AllowAdvertisements:        pref.AllowAdvertisements,
		AllowCallbackRequests:      pref.AllowCallbackRequests,
		AllowChat:                  pref.AllowChat,
		AllowDocumentShares:        pref.AllowDocumentShares,
		RequireCallApproval:        pref.RequireCallApproval,
	}, nil
}

func (h *UserHandler) ListAvailabilitySlots(ctx context.Context, req *pb.ListAvailabilitySlotsRequest) (*pb.ListAvailabilitySlotsResponse, error) {
	slots, err := h.uc.ListAvailabilitySlots(ctx, req.UserId)
	if err != nil {
		return nil, mapError(err)
	}
	pbSlots := make([]*pb.AvailabilitySlot, len(slots))
	for i, s := range slots {
		pbSlots[i] = &pb.AvailabilitySlot{
			Id:        s.ID,
			UserId:    s.UserID,
			DayOfWeek: int32(s.DayOfWeek),
			StartTime: s.StartTime,
			EndTime:   s.EndTime,
			SlotType:  s.SlotType,
			IsActive:  s.IsActive,
		}
	}
	return &pb.ListAvailabilitySlotsResponse{Slots: pbSlots}, nil
}

func (h *UserHandler) CreateAvailabilitySlot(ctx context.Context, req *pb.CreateAvailabilitySlotRequest) (*pb.AvailabilitySlot, error) {
	slot, err := h.uc.CreateAvailabilitySlot(ctx, req.UserId, int(req.DayOfWeek), req.StartTime, req.EndTime, req.SlotType)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.AvailabilitySlot{
		Id:        slot.ID,
		UserId:    slot.UserID,
		DayOfWeek: int32(slot.DayOfWeek),
		StartTime: slot.StartTime,
		EndTime:   slot.EndTime,
		SlotType:  slot.SlotType,
		IsActive:  slot.IsActive,
	}, nil
}

func (h *UserHandler) DeleteAvailabilitySlot(ctx context.Context, req *pb.DeleteAvailabilitySlotRequest) (*pb.DeleteAvailabilitySlotResponse, error) {
	// TODO: implement
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *UserHandler) ListDNDRules(ctx context.Context, req *pb.ListDNDRulesRequest) (*pb.ListDNDRulesResponse, error) {
	rules, err := h.uc.ListDNDRules(ctx, req.UserId)
	if err != nil {
		return nil, mapError(err)
	}
	pbRules := make([]*pb.DNDRule, len(rules))
	for i, r := range rules {
		days := make([]int32, len(r.DaysOfWeek))
		for j, d := range r.DaysOfWeek {
			days[j] = int32(d)
		}
		pbRules[i] = &pb.DNDRule{
			Id:         r.ID,
			UserId:     r.UserID,
			ScopeType:  r.ScopeType,
			ScopeRefId: r.ScopeRefID,
			StartTime:  r.StartTime,
			EndTime:    r.EndTime,
			DaysOfWeek: days,
			IsActive:   r.IsActive,
		}
	}
	return &pb.ListDNDRulesResponse{Rules: pbRules}, nil
}

func (h *UserHandler) CreateDNDRule(ctx context.Context, req *pb.CreateDNDRuleRequest) (*pb.DNDRule, error) {
	days := make([]int, len(req.DaysOfWeek))
	for i, d := range req.DaysOfWeek {
		days[i] = int(d)
	}
	rule, err := h.uc.CreateDNDRule(ctx, req.UserId, req.ScopeType, req.ScopeRefId, req.StartTime, req.EndTime, days)
	if err != nil {
		return nil, mapError(err)
	}
	pbDays := make([]int32, len(rule.DaysOfWeek))
	for i, d := range rule.DaysOfWeek {
		pbDays[i] = int32(d)
	}
	return &pb.DNDRule{
		Id:         rule.ID,
		UserId:     rule.UserID,
		ScopeType:  rule.ScopeType,
		ScopeRefId: rule.ScopeRefID,
		StartTime:  rule.StartTime,
		EndTime:    rule.EndTime,
		DaysOfWeek: pbDays,
		IsActive:   rule.IsActive,
	}, nil
}

func (h *UserHandler) UpdateDNDRule(ctx context.Context, req *pb.UpdateDNDRuleRequest) (*pb.DNDRule, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *UserHandler) DeleteDNDRule(ctx context.Context, req *pb.DeleteDNDRuleRequest) (*pb.DeleteDNDRuleResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *UserHandler) BlockOrganization(ctx context.Context, req *pb.BlockOrganizationRequest) (*pb.BlockOrganizationResponse, error) {
	err := h.uc.BlockOrganization(ctx, req.UserId, req.OrganizationId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.BlockOrganizationResponse{Success: true}, nil
}

func (h *UserHandler) UnblockOrganization(ctx context.Context, req *pb.UnblockOrganizationRequest) (*pb.UnblockOrganizationResponse, error) {
	err := h.uc.UnblockOrganization(ctx, req.UserId, req.OrganizationId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.UnblockOrganizationResponse{Success: true}, nil
}

func (h *UserHandler) ListBlockedOrganizations(ctx context.Context, req *pb.ListBlockedOrganizationsRequest) (*pb.ListBlockedOrganizationsResponse, error) {
	// TODO: implement
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func toPrefMap(req *pb.UpdatePrivacyPreferenceRequest) map[string]bool {
	m := make(map[string]bool)
	if req.AllowPersonalNotifications != nil {
		m["allow_personal_notifications"] = *req.AllowPersonalNotifications
	}
	if req.AllowOrgNotifications != nil {
		m["allow_org_notifications"] = *req.AllowOrgNotifications
	}
	if req.AllowAdvertisements != nil {
		m["allow_advertisements"] = *req.AllowAdvertisements
	}
	if req.AllowCallbackRequests != nil {
		m["allow_callback_requests"] = *req.AllowCallbackRequests
	}
	if req.AllowChat != nil {
		m["allow_chat"] = *req.AllowChat
	}
	if req.AllowDocumentShares != nil {
		m["allow_document_shares"] = *req.AllowDocumentShares
	}
	if req.RequireCallApproval != nil {
		m["require_call_approval"] = *req.RequireCallApproval
	}
	return m
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
