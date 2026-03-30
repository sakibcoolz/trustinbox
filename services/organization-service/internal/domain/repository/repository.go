package repository

import (
	"context"

	"github.com/trustinbox/organization-service/internal/domain/entity"
)

type ServiceProviderRepository interface {
	Create(ctx context.Context, sp *entity.ServiceProvider) error
	GetByID(ctx context.Context, id string) (*entity.ServiceProvider, error)
	List(ctx context.Context, search string, verificationStatus string, limit, offset int) ([]entity.ServiceProvider, int, error)
	Update(ctx context.Context, sp *entity.ServiceProvider) error
	UpdateVerificationStatus(ctx context.Context, id, status string) error
	UpdateStatus(ctx context.Context, id, status string) error
}

type ServiceProviderUserRepository interface {
	Add(ctx context.Context, spUser *entity.ServiceProviderUser) error
	Remove(ctx context.Context, id, spID string) error
	GetByID(ctx context.Context, id string) (*entity.ServiceProviderUser, error)
	ListBySP(ctx context.Context, spID string, limit, offset int) ([]entity.ServiceProviderUser, int, error)
	GetBySPAndUser(ctx context.Context, spID, userID string) (*entity.ServiceProviderUser, error)
}
