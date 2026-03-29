package usecase

import (
	"context"

	"github.com/google/uuid"
	bzerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/domain/repository"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

type OrgUseCase struct {
	orgRepo     repository.OrganizationRepository
	orgUserRepo repository.OrganizationUserRepository
	log         *zap.Logger
}

func NewOrgUseCase(
	orgRepo repository.OrganizationRepository,
	orgUserRepo repository.OrganizationUserRepository,
	log *zap.Logger,
) *OrgUseCase {
	return &OrgUseCase{orgRepo: orgRepo, orgUserRepo: orgUserRepo, log: log}
}

func (uc *OrgUseCase) CreateOrganization(ctx context.Context, org *entity.Organization, adminUserID string) (*entity.Organization, error) {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "CreateOrganization",
		attribute.String("name", org.Name),
	)
	defer span.End()

	org.ID = uuid.New().String()
	org.VerificationStatus = "PENDING"
	org.Status = "ACTIVE"

	if err := uc.orgRepo.Create(ctx, org); err != nil {
		return nil, bzerr.Internal("failed to create organization", err)
	}

	// Add admin user
	orgUser := &entity.OrganizationUser{
		ID:             uuid.New().String(),
		OrganizationID: org.ID,
		UserID:         adminUserID,
		Role:           "ORG_ADMIN",
		Status:         "ACTIVE",
	}
	if err := uc.orgUserRepo.Add(ctx, orgUser); err != nil {
		return nil, bzerr.Internal("failed to add admin user to organization", err)
	}

	return org, nil
}

func (uc *OrgUseCase) GetOrganization(ctx context.Context, id string) (*entity.Organization, error) {
	org, err := uc.orgRepo.GetByID(ctx, id)
	if err != nil {
		return nil, bzerr.NotFound("organization", id)
	}
	return org, nil
}

func (uc *OrgUseCase) ListOrganizations(ctx context.Context, search, verificationStatus string, limit, offset int) ([]entity.Organization, int, error) {
	return uc.orgRepo.List(ctx, search, verificationStatus, limit, offset)
}

func (uc *OrgUseCase) VerifyOrganization(ctx context.Context, orgID, decision, reason, adminUserID string) error {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "VerifyOrganization",
		attribute.String("org_id", orgID),
		attribute.String("decision", decision),
	)
	defer span.End()

	status := "VERIFIED"
	if decision == "REJECTED" {
		status = "REJECTED"
	}

	return uc.orgRepo.UpdateVerificationStatus(ctx, orgID, status)
}

func (uc *OrgUseCase) SuspendOrganization(ctx context.Context, orgID, reason, adminUserID string) error {
	return uc.orgRepo.UpdateStatus(ctx, orgID, "SUSPENDED")
}

func (uc *OrgUseCase) UpdateOrganization(ctx context.Context, org *entity.Organization) error {
	if err := uc.orgRepo.Update(ctx, org); err != nil {
		return bzerr.Internal("failed to update organization", err)
	}
	return nil
}

func (uc *OrgUseCase) AddOrgUser(ctx context.Context, orgUser *entity.OrganizationUser) (*entity.OrganizationUser, error) {
	orgUser.ID = uuid.New().String()
	orgUser.Status = "ACTIVE"
	if err := uc.orgUserRepo.Add(ctx, orgUser); err != nil {
		return nil, bzerr.Internal("failed to add organization user", err)
	}
	return orgUser, nil
}

func (uc *OrgUseCase) RemoveOrgUser(ctx context.Context, id, orgID string) error {
	if err := uc.orgUserRepo.Remove(ctx, id, orgID); err != nil {
		return bzerr.Internal("failed to remove organization user", err)
	}
	return nil
}

func (uc *OrgUseCase) ListOrgUsers(ctx context.Context, orgID string, limit, offset int) ([]entity.OrganizationUser, int, error) {
	return uc.orgUserRepo.ListByOrg(ctx, orgID, limit, offset)
}

func (uc *OrgUseCase) GetOrgUser(ctx context.Context, id string) (*entity.OrganizationUser, error) {
	u, err := uc.orgUserRepo.GetByID(ctx, id)
	if err != nil {
		return nil, bzerr.NotFound("organization user", id)
	}
	return u, nil
}
