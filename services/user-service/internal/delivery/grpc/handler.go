package grpc

import (
	"context"

	bizerr "github.com/trustinbox/cornerstone/errors"
	pb "github.com/trustinbox/proto/gen/user/v1"
	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/usecase"
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
		UserId:    profile.UserID,
		FullName:  profile.FullName,
		AvatarUrl: profile.AvatarURL,
		Timezone:  profile.Timezone,
		Language:  profile.Language,
	}, nil
}

func (h *UserHandler) UpdateUserProfile(ctx context.Context, req *pb.UpdateUserProfileRequest) (*pb.UpdateUserProfileResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "not implemented")
}

func (h *UserHandler) GetPrivacyPreference(ctx context.Context, req *pb.GetPrivacyPreferenceRequest) (*pb.PrivacyPreference, error) {
	pref, err := h.uc.GetPrivacyPreference(ctx, req.UserId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.PrivacyPreference{
		UserId:                     pref.UserID,
		AllowPersonalNotifications: pref.AllowPersonalNotifications,
		AllowSpNotifications:       pref.AllowOrgNotifications,
		AllowAdvertisements:        pref.AllowAdvertisements,
		AllowCallbackRequests:      pref.AllowCallbackRequests,
		AllowChat:                  pref.AllowChat,
		AllowDocumentShares:        pref.AllowDocumentShares,
		RequireCallApproval:        pref.RequireCallApproval,
		NotificationSoundEnabled:   pref.NotificationSoundEnabled,
	}, nil
}

func (h *UserHandler) UpdatePrivacyPreference(ctx context.Context, req *pb.UpdatePrivacyPreferenceRequest) (*pb.PrivacyPreference, error) {
	pref := &entity.PrivacyPreference{UserID: req.UserId}
	if req.AllowPersonalNotifications != nil {
		pref.AllowPersonalNotifications = *req.AllowPersonalNotifications
	}
	if req.AllowSpNotifications != nil {
		pref.AllowOrgNotifications = *req.AllowSpNotifications
	}
	if req.AllowAdvertisements != nil {
		pref.AllowAdvertisements = *req.AllowAdvertisements
	}
	if req.AllowCallbackRequests != nil {
		pref.AllowCallbackRequests = *req.AllowCallbackRequests
	}
	if req.AllowChat != nil {
		pref.AllowChat = *req.AllowChat
	}
	if req.AllowDocumentShares != nil {
		pref.AllowDocumentShares = *req.AllowDocumentShares
	}
	if req.RequireCallApproval != nil {
		pref.RequireCallApproval = *req.RequireCallApproval
	}
	if req.NotificationSoundEnabled != nil {
		pref.NotificationSoundEnabled = *req.NotificationSoundEnabled
	}

	if err := h.uc.UpdatePrivacyPreference(ctx, pref); err != nil {
		return nil, mapError(err)
	}
	return &pb.PrivacyPreference{
		UserId:                     pref.UserID,
		AllowPersonalNotifications: pref.AllowPersonalNotifications,
		AllowSpNotifications:       pref.AllowOrgNotifications,
		AllowAdvertisements:        pref.AllowAdvertisements,
		AllowCallbackRequests:      pref.AllowCallbackRequests,
		AllowChat:                  pref.AllowChat,
		AllowDocumentShares:        pref.AllowDocumentShares,
		RequireCallApproval:        pref.RequireCallApproval,
		NotificationSoundEnabled:   pref.NotificationSoundEnabled,
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
	slot, err := h.uc.CreateAvailabilitySlot(ctx, &entity.AvailabilitySlot{
		UserID:    req.UserId,
		DayOfWeek: int(req.DayOfWeek),
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
		SlotType:  req.SlotType,
		IsActive:  true,
	})
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
	rule, err := h.uc.CreateDNDRule(ctx, &entity.DNDRule{
		UserID:     req.UserId,
		ScopeType:  req.ScopeType,
		ScopeRefID: req.ScopeRefId,
		StartTime:  req.StartTime,
		EndTime:    req.EndTime,
		DaysOfWeek: days,
		IsActive:   req.IsActive,
	})
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

func (h *UserHandler) BlockServiceProvider(ctx context.Context, req *pb.BlockServiceProviderRequest) (*pb.BlockServiceProviderResponse, error) {
	err := h.uc.BlockServiceProvider(ctx, req.UserId, req.ServiceProviderId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.BlockServiceProviderResponse{Success: true}, nil
}

func (h *UserHandler) UnblockServiceProvider(ctx context.Context, req *pb.UnblockServiceProviderRequest) (*pb.UnblockServiceProviderResponse, error) {
	err := h.uc.UnblockServiceProvider(ctx, req.UserId, req.ServiceProviderId)
	if err != nil {
		return nil, mapError(err)
	}
	return &pb.UnblockServiceProviderResponse{Success: true}, nil
}

func (h *UserHandler) ListBlockedServiceProviders(ctx context.Context, req *pb.ListBlockedServiceProvidersRequest) (*pb.ListBlockedServiceProvidersResponse, error) {
	blocked, err := h.uc.ListBlockedServiceProviders(ctx, req.UserId)
	if err != nil {
		return nil, mapError(err)
	}
	ids := make([]string, len(blocked))
	for i, b := range blocked {
		ids[i] = b.ServiceProviderID
	}
	return &pb.ListBlockedServiceProvidersResponse{ServiceProviderIds: ids}, nil
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

// ─── Address Handlers ──────────────────────────────────────────────────────

func (h *UserHandler) CreateAddress(ctx context.Context, req *pb.CreateAddressRequest) (*pb.UserAddress, error) {
	addr, err := h.uc.CreateAddress(ctx, &entity.UserAddress{
		UserID:       req.UserId,
		Label:        req.Label,
		AddressLine1: req.AddressLine1,
		AddressLine2: req.AddressLine2,
		City:         req.City,
		State:        req.State,
		PostalCode:   req.PostalCode,
		Country:      req.Country,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		IsCurrent:    req.IsCurrent,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return addrToProto(addr), nil
}

func (h *UserHandler) UpdateAddress(ctx context.Context, req *pb.UpdateAddressRequest) (*pb.UserAddress, error) {
	addr, err := h.uc.UpdateAddress(ctx, &entity.UserAddress{
		ID:           req.Id,
		UserID:       req.UserId,
		Label:        req.Label,
		AddressLine1: req.AddressLine1,
		AddressLine2: req.AddressLine2,
		City:         req.City,
		State:        req.State,
		PostalCode:   req.PostalCode,
		Country:      req.Country,
		Latitude:     req.Latitude,
		Longitude:    req.Longitude,
		IsCurrent:    req.IsCurrent,
	})
	if err != nil {
		return nil, mapError(err)
	}
	return addrToProto(addr), nil
}

func (h *UserHandler) DeleteAddress(ctx context.Context, req *pb.DeleteAddressRequest) (*pb.DeleteAddressResponse, error) {
	if err := h.uc.DeleteAddress(ctx, req.Id, req.UserId); err != nil {
		return nil, mapError(err)
	}
	return &pb.DeleteAddressResponse{Success: true}, nil
}

func (h *UserHandler) ListAddresses(ctx context.Context, req *pb.ListAddressesRequest) (*pb.ListAddressesResponse, error) {
	addrs, err := h.uc.ListAddresses(ctx, req.UserId)
	if err != nil {
		return nil, mapError(err)
	}
	pbAddrs := make([]*pb.UserAddress, len(addrs))
	for i, a := range addrs {
		pbAddrs[i] = addrToProto(&a)
	}
	return &pb.ListAddressesResponse{Addresses: pbAddrs}, nil
}

func (h *UserHandler) SetCurrentAddress(ctx context.Context, req *pb.SetCurrentAddressRequest) (*pb.SetCurrentAddressResponse, error) {
	if err := h.uc.SetCurrentAddress(ctx, req.Id, req.UserId); err != nil {
		return nil, mapError(err)
	}
	return &pb.SetCurrentAddressResponse{Success: true}, nil
}

func (h *UserHandler) GetCurrentAddress(ctx context.Context, req *pb.GetCurrentAddressRequest) (*pb.UserAddress, error) {
	addr, err := h.uc.GetCurrentAddress(ctx, req.UserId)
	if err != nil {
		return nil, mapError(err)
	}
	return addrToProto(addr), nil
}

func addrToProto(a *entity.UserAddress) *pb.UserAddress {
	return &pb.UserAddress{
		Id:           a.ID,
		UserId:       a.UserID,
		Label:        a.Label,
		AddressLine1: a.AddressLine1,
		AddressLine2: a.AddressLine2,
		City:         a.City,
		State:        a.State,
		PostalCode:   a.PostalCode,
		Country:      a.Country,
		Latitude:     a.Latitude,
		Longitude:    a.Longitude,
		IsCurrent:    a.IsCurrent,
	}
}
