package usecase

import (
	"context"

	"github.com/google/uuid"
	bzerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/domain/repository"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

type UserUseCase struct {
	profileRepo      repository.UserProfileRepository
	privacyRepo      repository.PrivacyPreferenceRepository
	dndRepo          repository.DNDRuleRepository
	availabilityRepo repository.AvailabilitySlotRepository
	blockRepo        repository.BlockedServiceProviderRepository
	addressRepo      repository.UserAddressRepository
	log              *zap.Logger
}

func NewUserUseCase(
	profileRepo repository.UserProfileRepository,
	privacyRepo repository.PrivacyPreferenceRepository,
	dndRepo repository.DNDRuleRepository,
	availabilityRepo repository.AvailabilitySlotRepository,
	blockRepo repository.BlockedServiceProviderRepository,
	addressRepo repository.UserAddressRepository,
	log *zap.Logger,
) *UserUseCase {
	return &UserUseCase{
		profileRepo:      profileRepo,
		privacyRepo:      privacyRepo,
		dndRepo:          dndRepo,
		availabilityRepo: availabilityRepo,
		blockRepo:        blockRepo,
		addressRepo:      addressRepo,
		log:              log,
	}
}

func (uc *UserUseCase) GetProfile(ctx context.Context, userID string) (*entity.UserProfile, error) {
	ctx, span := tracing.StartSpan(ctx, "user-service", "GetProfile",
		attribute.String("user_id", userID),
	)
	defer span.End()

	profile, err := uc.profileRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, bzerr.NotFound("user", userID)
	}
	return profile, nil
}

func (uc *UserUseCase) GetPrivacyPreference(ctx context.Context, userID string) (*entity.PrivacyPreference, error) {
	ctx, span := tracing.StartSpan(ctx, "user-service", "GetPrivacyPreference",
		attribute.String("user_id", userID),
	)
	defer span.End()

	return uc.privacyRepo.Get(ctx, userID)
}

func (uc *UserUseCase) UpdatePrivacyPreference(ctx context.Context, pref *entity.PrivacyPreference) error {
	ctx, span := tracing.StartSpan(ctx, "user-service", "UpdatePrivacyPreference",
		attribute.String("user_id", pref.UserID),
	)
	defer span.End()

	return uc.privacyRepo.Upsert(ctx, pref)
}

func (uc *UserUseCase) CreateDNDRule(ctx context.Context, rule *entity.DNDRule) (*entity.DNDRule, error) {
	rule.ID = uuid.New().String()
	if err := uc.dndRepo.Create(ctx, rule); err != nil {
		return nil, bzerr.Internal("failed to create DND rule", err)
	}
	return rule, nil
}

func (uc *UserUseCase) ListDNDRules(ctx context.Context, userID string) ([]entity.DNDRule, error) {
	return uc.dndRepo.ListByUser(ctx, userID)
}

func (uc *UserUseCase) CreateAvailabilitySlot(ctx context.Context, slot *entity.AvailabilitySlot) (*entity.AvailabilitySlot, error) {
	slot.ID = uuid.New().String()
	if err := uc.availabilityRepo.Create(ctx, slot); err != nil {
		return nil, bzerr.Internal("failed to create availability slot", err)
	}
	return slot, nil
}

func (uc *UserUseCase) ListAvailabilitySlots(ctx context.Context, userID string) ([]entity.AvailabilitySlot, error) {
	return uc.availabilityRepo.ListByUser(ctx, userID)
}

func (uc *UserUseCase) BlockServiceProvider(ctx context.Context, userID, spID string) error {
	return uc.blockRepo.Block(ctx, &entity.BlockedServiceProvider{
		ID:                uuid.New().String(),
		UserID:            userID,
		ServiceProviderID: spID,
	})
}

func (uc *UserUseCase) UnblockServiceProvider(ctx context.Context, userID, spID string) error {
	return uc.blockRepo.Unblock(ctx, userID, spID)
}

func (uc *UserUseCase) ListBlockedServiceProviders(ctx context.Context, userID string) ([]entity.BlockedServiceProvider, error) {
	return uc.blockRepo.ListByUser(ctx, userID)
}

// ─── Address Methods ───────────────────────────────────────────────────────

func (uc *UserUseCase) CreateAddress(ctx context.Context, addr *entity.UserAddress) (*entity.UserAddress, error) {
	ctx, span := tracing.StartSpan(ctx, "user-service", "CreateAddress",
		attribute.String("user_id", addr.UserID),
	)
	defer span.End()

	addr.ID = uuid.New().String()
	if addr.Label == "" {
		addr.Label = "Home"
	}
	if err := uc.addressRepo.Create(ctx, addr); err != nil {
		return nil, bzerr.Internal("failed to create address", err)
	}
	// If marked as current, ensure only this one is current
	if addr.IsCurrent {
		if err := uc.addressRepo.SetCurrent(ctx, addr.ID, addr.UserID); err != nil {
			uc.log.Error("failed to set current address", zap.Error(err))
		}
	}
	uc.log.Info("address created", zap.String("address_id", addr.ID), zap.String("user_id", addr.UserID))
	return addr, nil
}

func (uc *UserUseCase) UpdateAddress(ctx context.Context, addr *entity.UserAddress) (*entity.UserAddress, error) {
	ctx, span := tracing.StartSpan(ctx, "user-service", "UpdateAddress",
		attribute.String("user_id", addr.UserID),
		attribute.String("address_id", addr.ID),
	)
	defer span.End()

	if err := uc.addressRepo.Update(ctx, addr); err != nil {
		return nil, bzerr.Internal("failed to update address", err)
	}
	if addr.IsCurrent {
		if err := uc.addressRepo.SetCurrent(ctx, addr.ID, addr.UserID); err != nil {
			uc.log.Error("failed to set current address", zap.Error(err))
		}
	}
	return addr, nil
}

func (uc *UserUseCase) DeleteAddress(ctx context.Context, id, userID string) error {
	ctx, span := tracing.StartSpan(ctx, "user-service", "DeleteAddress",
		attribute.String("user_id", userID),
		attribute.String("address_id", id),
	)
	defer span.End()

	return uc.addressRepo.Delete(ctx, id, userID)
}

func (uc *UserUseCase) ListAddresses(ctx context.Context, userID string) ([]entity.UserAddress, error) {
	ctx, span := tracing.StartSpan(ctx, "user-service", "ListAddresses",
		attribute.String("user_id", userID),
	)
	defer span.End()

	return uc.addressRepo.ListByUser(ctx, userID)
}

func (uc *UserUseCase) SetCurrentAddress(ctx context.Context, id, userID string) error {
	ctx, span := tracing.StartSpan(ctx, "user-service", "SetCurrentAddress",
		attribute.String("user_id", userID),
		attribute.String("address_id", id),
	)
	defer span.End()

	return uc.addressRepo.SetCurrent(ctx, id, userID)
}

func (uc *UserUseCase) GetCurrentAddress(ctx context.Context, userID string) (*entity.UserAddress, error) {
	ctx, span := tracing.StartSpan(ctx, "user-service", "GetCurrentAddress",
		attribute.String("user_id", userID),
	)
	defer span.End()

	return uc.addressRepo.GetCurrent(ctx, userID)
}
