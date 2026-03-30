package repository

import (
	"context"

	"github.com/trustinbox/user-service/internal/domain/entity"
)

type UserProfileRepository interface {
	GetByID(ctx context.Context, userID string) (*entity.UserProfile, error)
	Update(ctx context.Context, profile *entity.UserProfile) error
}

type UserIdentityRepository interface {
	GetByUserID(ctx context.Context, userID string) (*entity.UserIdentity, error)
	GetByVirtualID(ctx context.Context, virtualID string) (*entity.UserIdentity, error)
	Create(ctx context.Context, identity *entity.UserIdentity) error
}

type PrivacyPreferenceRepository interface {
	Get(ctx context.Context, userID string) (*entity.PrivacyPreference, error)
	Upsert(ctx context.Context, pref *entity.PrivacyPreference) error
}

type DNDRuleRepository interface {
	ListByUser(ctx context.Context, userID string) ([]entity.DNDRule, error)
	Create(ctx context.Context, rule *entity.DNDRule) error
	Update(ctx context.Context, rule *entity.DNDRule) error
	Delete(ctx context.Context, id, userID string) error
}

type AvailabilitySlotRepository interface {
	ListByUser(ctx context.Context, userID string) ([]entity.AvailabilitySlot, error)
	Create(ctx context.Context, slot *entity.AvailabilitySlot) error
	Delete(ctx context.Context, id, userID string) error
}

type BlockedServiceProviderRepository interface {
	IsBlocked(ctx context.Context, userID, spID string) (bool, error)
	Block(ctx context.Context, blocked *entity.BlockedServiceProvider) error
	Unblock(ctx context.Context, userID, spID string) error
	ListByUser(ctx context.Context, userID string) ([]entity.BlockedServiceProvider, error)
}
