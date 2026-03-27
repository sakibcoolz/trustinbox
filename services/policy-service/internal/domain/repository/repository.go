package repository

import (
	"context"

	"github.com/trustinbox/policy-service/internal/domain/entity"
)

// UserPreferenceRepository loads user privacy preferences.
type UserPreferenceRepository interface {
	GetPreferences(ctx context.Context, userID string) (*entity.UserPreferences, error)
	GetDNDRules(ctx context.Context, userID string) ([]entity.DNDRule, error)
	GetAvailabilitySlots(ctx context.Context, userID string) ([]entity.AvailabilitySlot, error)
	IsOrganizationBlocked(ctx context.Context, userID, orgID string) (bool, error)
}

// OrganizationRepository loads organization status.
type OrganizationRepository interface {
	GetOrganizationStatus(ctx context.Context, orgID string) (*entity.OrganizationStatus, error)
}

// FrequencyRepository tracks communication frequency.
type FrequencyRepository interface {
	GetAdCountForUser(ctx context.Context, userID, orgID string) (int, error)
	IncrementAdCount(ctx context.Context, userID, orgID string) error
}
