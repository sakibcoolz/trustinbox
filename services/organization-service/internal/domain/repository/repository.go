package repository

import (
	"context"

	"github.com/trustinbox/organization-service/internal/domain/entity"
)

type OrganizationRepository interface {
	Create(ctx context.Context, org *entity.Organization) error
	GetByID(ctx context.Context, id string) (*entity.Organization, error)
	List(ctx context.Context, search string, verificationStatus string, limit, offset int) ([]entity.Organization, int, error)
	Update(ctx context.Context, org *entity.Organization) error
	UpdateVerificationStatus(ctx context.Context, id, status string) error
	UpdateStatus(ctx context.Context, id, status string) error
}

type OrganizationUserRepository interface {
	Add(ctx context.Context, orgUser *entity.OrganizationUser) error
	Remove(ctx context.Context, id, orgID string) error
	GetByID(ctx context.Context, id string) (*entity.OrganizationUser, error)
	ListByOrg(ctx context.Context, orgID string, limit, offset int) ([]entity.OrganizationUser, int, error)
	GetByOrgAndUser(ctx context.Context, orgID, userID string) (*entity.OrganizationUser, error)
}
