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
	blockRepo        repository.BlockedOrganizationRepository
	log              *zap.Logger
}

func NewUserUseCase(
	profileRepo repository.UserProfileRepository,
	privacyRepo repository.PrivacyPreferenceRepository,
	dndRepo repository.DNDRuleRepository,
	availabilityRepo repository.AvailabilitySlotRepository,
	blockRepo repository.BlockedOrganizationRepository,
	log *zap.Logger,
) *UserUseCase {
	return &UserUseCase{
		profileRepo:      profileRepo,
		privacyRepo:      privacyRepo,
		dndRepo:          dndRepo,
		availabilityRepo: availabilityRepo,
		blockRepo:        blockRepo,
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

func (uc *UserUseCase) BlockOrganization(ctx context.Context, userID, orgID string) error {
	return uc.blockRepo.Block(ctx, &entity.BlockedOrganization{
		ID:             uuid.New().String(),
		UserID:         userID,
		OrganizationID: orgID,
	})
}

func (uc *UserUseCase) UnblockOrganization(ctx context.Context, userID, orgID string) error {
	return uc.blockRepo.Unblock(ctx, userID, orgID)
}

func (uc *UserUseCase) UpdateProfile(ctx context.Context, profile *entity.UserProfile) error {
	return uc.profileRepo.Update(ctx, profile)
}

func (uc *UserUseCase) GetPrivacyPreference(ctx context.Context, userID string) (*entity.PrivacyPreference, error) {
	return uc.privacyRepo.Get(ctx, userID)
}

func (uc *UserUseCase) UpdateDNDRule(ctx context.Context, rule *entity.DNDRule) (*entity.DNDRule, error) {
	if err := uc.dndRepo.Update(ctx, rule); err != nil {
		return nil, bzerr.Internal("failed to update DND rule", err)
	}
	return rule, nil
}

func (uc *UserUseCase) DeleteDNDRule(ctx context.Context, id, userID string) error {
	return uc.dndRepo.Delete(ctx, id, userID)
}

func (uc *UserUseCase) DeleteAvailabilitySlot(ctx context.Context, id, userID string) error {
	return uc.availabilityRepo.Delete(ctx, id, userID)
}

func (uc *UserUseCase) ListBlockedOrganizations(ctx context.Context, userID string) ([]entity.BlockedOrganization, error) {
	return uc.blockRepo.ListByUser(ctx, userID)
}
