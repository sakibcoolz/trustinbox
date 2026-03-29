package grpc

import (
	"context"

	userv1 "github.com/trustinbox/proto/gen/user/v1"
	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/usecase"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type UserGRPCHandler struct {
	userv1.UnimplementedUserServiceServer
	uc *usecase.UserUseCase
}

func NewUserGRPCHandler(uc *usecase.UserUseCase) *UserGRPCHandler {
	return &UserGRPCHandler{uc: uc}
}

func (h *UserGRPCHandler) GetUserProfile(ctx context.Context, req *userv1.GetUserProfileRequest) (*userv1.GetUserProfileResponse, error) {
	profile, err := h.uc.GetProfile(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "profile not found: %v", err)
	}
	return &userv1.GetUserProfileResponse{
		UserId:    profile.UserID,
		FullName:  profile.FullName,
		AvatarUrl: profile.AvatarURL,
		Timezone:  profile.Timezone,
		Language:  profile.Language,
	}, nil
}

func (h *UserGRPCHandler) UpdateUserProfile(ctx context.Context, req *userv1.UpdateUserProfileRequest) (*userv1.UpdateUserProfileResponse, error) {
	profile := &entity.UserProfile{
		UserID:    req.GetUserId(),
		FullName:  req.GetFullName(),
		AvatarURL: req.GetAvatarUrl(),
		Timezone:  req.GetTimezone(),
		Language:  req.GetLanguage(),
	}
	if err := h.uc.UpdateProfile(ctx, profile); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update profile: %v", err)
	}
	return &userv1.UpdateUserProfileResponse{Success: true}, nil
}

func (h *UserGRPCHandler) GetPrivacyPreference(ctx context.Context, req *userv1.GetPrivacyPreferenceRequest) (*userv1.PrivacyPreference, error) {
	pref, err := h.uc.GetPrivacyPreference(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "privacy preference not found: %v", err)
	}
	return privacyPreferenceToProto(pref), nil
}

func (h *UserGRPCHandler) UpdatePrivacyPreference(ctx context.Context, req *userv1.UpdatePrivacyPreferenceRequest) (*userv1.PrivacyPreference, error) {
	existing, err := h.uc.GetPrivacyPreference(ctx, req.GetUserId())
	if err != nil {
		existing = &entity.PrivacyPreference{UserID: req.GetUserId()}
	}

	if req.AllowPersonalNotifications != nil {
		existing.AllowPersonalNotifications = req.GetAllowPersonalNotifications()
	}
	if req.AllowOrgNotifications != nil {
		existing.AllowOrgNotifications = req.GetAllowOrgNotifications()
	}
	if req.AllowAdvertisements != nil {
		existing.AllowAdvertisements = req.GetAllowAdvertisements()
	}
	if req.AllowCallbackRequests != nil {
		existing.AllowCallbackRequests = req.GetAllowCallbackRequests()
	}
	if req.AllowChat != nil {
		existing.AllowChat = req.GetAllowChat()
	}
	if req.AllowDocumentShares != nil {
		existing.AllowDocumentShares = req.GetAllowDocumentShares()
	}
	if req.RequireCallApproval != nil {
		existing.RequireCallApproval = req.GetRequireCallApproval()
	}

	if err := h.uc.UpdatePrivacyPreference(ctx, existing); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update privacy preference: %v", err)
	}
	return privacyPreferenceToProto(existing), nil
}

func (h *UserGRPCHandler) ListAvailabilitySlots(ctx context.Context, req *userv1.ListAvailabilitySlotsRequest) (*userv1.ListAvailabilitySlotsResponse, error) {
	slots, err := h.uc.ListAvailabilitySlots(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list availability slots: %v", err)
	}
	protoSlots := make([]*userv1.AvailabilitySlot, 0, len(slots))
	for _, s := range slots {
		protoSlots = append(protoSlots, availabilitySlotToProto(&s))
	}
	return &userv1.ListAvailabilitySlotsResponse{Slots: protoSlots}, nil
}

func (h *UserGRPCHandler) CreateAvailabilitySlot(ctx context.Context, req *userv1.CreateAvailabilitySlotRequest) (*userv1.AvailabilitySlot, error) {
	slot := &entity.AvailabilitySlot{
		UserID:    req.GetUserId(),
		DayOfWeek: int(req.GetDayOfWeek()),
		StartTime: req.GetStartTime(),
		EndTime:   req.GetEndTime(),
		SlotType:  req.GetSlotType(),
		IsActive:  true,
	}
	created, err := h.uc.CreateAvailabilitySlot(ctx, slot)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create availability slot: %v", err)
	}
	return availabilitySlotToProto(created), nil
}

func (h *UserGRPCHandler) DeleteAvailabilitySlot(ctx context.Context, req *userv1.DeleteAvailabilitySlotRequest) (*userv1.DeleteAvailabilitySlotResponse, error) {
	if err := h.uc.DeleteAvailabilitySlot(ctx, req.GetId(), req.GetUserId()); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete availability slot: %v", err)
	}
	return &userv1.DeleteAvailabilitySlotResponse{Success: true}, nil
}

func (h *UserGRPCHandler) ListDNDRules(ctx context.Context, req *userv1.ListDNDRulesRequest) (*userv1.ListDNDRulesResponse, error) {
	rules, err := h.uc.ListDNDRules(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list DND rules: %v", err)
	}
	protoRules := make([]*userv1.DNDRule, 0, len(rules))
	for _, r := range rules {
		protoRules = append(protoRules, dndRuleToProto(&r))
	}
	return &userv1.ListDNDRulesResponse{Rules: protoRules}, nil
}

func (h *UserGRPCHandler) CreateDNDRule(ctx context.Context, req *userv1.CreateDNDRuleRequest) (*userv1.DNDRule, error) {
	daysOfWeek := int32SliceToIntSlice(req.GetDaysOfWeek())
	rule := &entity.DNDRule{
		UserID:     req.GetUserId(),
		ScopeType:  req.GetScopeType(),
		ScopeRefID: req.GetScopeRefId(),
		StartTime:  req.GetStartTime(),
		EndTime:    req.GetEndTime(),
		DaysOfWeek: daysOfWeek,
		IsActive:   req.GetIsActive(),
	}
	created, err := h.uc.CreateDNDRule(ctx, rule)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create DND rule: %v", err)
	}
	return dndRuleToProto(created), nil
}

func (h *UserGRPCHandler) UpdateDNDRule(ctx context.Context, req *userv1.UpdateDNDRuleRequest) (*userv1.DNDRule, error) {
	daysOfWeek := int32SliceToIntSlice(req.GetDaysOfWeek())
	rule := &entity.DNDRule{
		ID:         req.GetId(),
		UserID:     req.GetUserId(),
		StartTime:  req.GetStartTime(),
		EndTime:    req.GetEndTime(),
		DaysOfWeek: daysOfWeek,
		IsActive:   req.GetIsActive(),
	}
	updated, err := h.uc.UpdateDNDRule(ctx, rule)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to update DND rule: %v", err)
	}
	return dndRuleToProto(updated), nil
}

func (h *UserGRPCHandler) DeleteDNDRule(ctx context.Context, req *userv1.DeleteDNDRuleRequest) (*userv1.DeleteDNDRuleResponse, error) {
	if err := h.uc.DeleteDNDRule(ctx, req.GetId(), req.GetUserId()); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete DND rule: %v", err)
	}
	return &userv1.DeleteDNDRuleResponse{Success: true}, nil
}

func (h *UserGRPCHandler) BlockOrganization(ctx context.Context, req *userv1.BlockOrganizationRequest) (*userv1.BlockOrganizationResponse, error) {
	if err := h.uc.BlockOrganization(ctx, req.GetUserId(), req.GetOrganizationId()); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to block organization: %v", err)
	}
	return &userv1.BlockOrganizationResponse{Success: true}, nil
}

func (h *UserGRPCHandler) UnblockOrganization(ctx context.Context, req *userv1.UnblockOrganizationRequest) (*userv1.UnblockOrganizationResponse, error) {
	if err := h.uc.UnblockOrganization(ctx, req.GetUserId(), req.GetOrganizationId()); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to unblock organization: %v", err)
	}
	return &userv1.UnblockOrganizationResponse{Success: true}, nil
}

func (h *UserGRPCHandler) ListBlockedOrganizations(ctx context.Context, req *userv1.ListBlockedOrganizationsRequest) (*userv1.ListBlockedOrganizationsResponse, error) {
	blocked, err := h.uc.ListBlockedOrganizations(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list blocked organizations: %v", err)
	}
	orgIDs := make([]string, 0, len(blocked))
	for _, b := range blocked {
		orgIDs = append(orgIDs, b.OrganizationID)
	}
	return &userv1.ListBlockedOrganizationsResponse{OrganizationIds: orgIDs}, nil
}

func privacyPreferenceToProto(p *entity.PrivacyPreference) *userv1.PrivacyPreference {
	return &userv1.PrivacyPreference{
		UserId:                     p.UserID,
		AllowPersonalNotifications: p.AllowPersonalNotifications,
		AllowOrgNotifications:      p.AllowOrgNotifications,
		AllowAdvertisements:        p.AllowAdvertisements,
		AllowCallbackRequests:      p.AllowCallbackRequests,
		AllowChat:                  p.AllowChat,
		AllowDocumentShares:        p.AllowDocumentShares,
		RequireCallApproval:        p.RequireCallApproval,
	}
}

func availabilitySlotToProto(s *entity.AvailabilitySlot) *userv1.AvailabilitySlot {
	return &userv1.AvailabilitySlot{
		Id:        s.ID,
		UserId:    s.UserID,
		DayOfWeek: int32(s.DayOfWeek),
		StartTime: s.StartTime,
		EndTime:   s.EndTime,
		SlotType:  s.SlotType,
		IsActive:  s.IsActive,
	}
}

func dndRuleToProto(r *entity.DNDRule) *userv1.DNDRule {
	return &userv1.DNDRule{
		Id:         r.ID,
		UserId:     r.UserID,
		ScopeType:  r.ScopeType,
		ScopeRefId: r.ScopeRefID,
		StartTime:  r.StartTime,
		EndTime:    r.EndTime,
		DaysOfWeek: intSliceToInt32Slice(r.DaysOfWeek),
		IsActive:   r.IsActive,
	}
}

func int32SliceToIntSlice(s []int32) []int {
	result := make([]int, len(s))
	for i, v := range s {
		result[i] = int(v)
	}
	return result
}

func intSliceToInt32Slice(s []int) []int32 {
	result := make([]int32, len(s))
	for i, v := range s {
		result[i] = int32(v)
	}
	return result
}
