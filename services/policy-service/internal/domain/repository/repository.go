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
	IsServiceProviderBlocked(ctx context.Context, userID, spID string) (bool, error)
}

// ServiceProviderRepository loads service provider status.
type ServiceProviderRepository interface {
	GetServiceProviderStatus(ctx context.Context, spID string) (*entity.ServiceProviderStatus, error)
}

// FrequencyRepository tracks communication frequency.
type FrequencyRepository interface {
	GetAdCountForUser(ctx context.Context, userID, spID string) (int, error)
	IncrementAdCount(ctx context.Context, userID, spID string) error
}
