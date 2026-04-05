package repository

import (
	"context"

	"github.com/trustinbox/organization-service/internal/domain/entity"
)

type ServiceProviderRepository interface {
	Create(ctx context.Context, sp *entity.ServiceProvider) error
	GetByID(ctx context.Context, id string) (*entity.ServiceProvider, error)
	List(ctx context.Context, search string, verificationStatus string, serviceMode string, limit, offset int) ([]entity.ServiceProvider, int, error)
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
	UpdateRole(ctx context.Context, id, spID, role string) error
	UpdateStatus(ctx context.Context, id, spID, status string) error
	CountByRole(ctx context.Context, spID, role string) (int, error)
}

type InvitationRepository interface {
	Create(ctx context.Context, inv *entity.Invitation) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*entity.Invitation, error)
	GetByID(ctx context.Context, id string) (*entity.Invitation, error)
	ListBySP(ctx context.Context, spID, status string, limit, offset int) ([]entity.Invitation, int, error)
	UpdateStatus(ctx context.Context, id, status string) error
	GetPendingByEmailAndSP(ctx context.Context, email, spID string) (*entity.Invitation, error)
}
