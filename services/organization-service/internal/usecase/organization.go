package usecase

import (
	"context"

	"github.com/google/uuid"
	bzerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/cornerstone/events"
	"github.com/trustinbox/cornerstone/tracing"
	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/domain/repository"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

type OrgUseCase struct {
	orgRepo     repository.OrganizationRepository
	orgUserRepo repository.OrganizationUserRepository
	publisher   events.EventPublisher
	log         *zap.Logger
}

func NewOrgUseCase(
	orgRepo repository.OrganizationRepository,
	orgUserRepo repository.OrganizationUserRepository,
	publisher events.EventPublisher,
	log *zap.Logger,
) *OrgUseCase {
	if publisher == nil {
		publisher = events.NoopPublisher{}
	}
	return &OrgUseCase{orgRepo: orgRepo, orgUserRepo: orgUserRepo, publisher: publisher, log: log}
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

	evt := events.NewEvent(events.OrganizationCreated, "organization-service", map[string]string{
		"org_name": org.Name,
		"admin_id": adminUserID,
	}).WithOrg(org.ID).WithUser(adminUserID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish org created event", zap.Error(err))
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

	if err := uc.orgRepo.UpdateVerificationStatus(ctx, orgID, status); err != nil {
		return err
	}

	evtType := events.OrganizationVerified
	if decision == "REJECTED" {
		evtType = events.OrganizationRejected
	}
	evt := events.NewEvent(evtType, "organization-service", map[string]string{
		"decision":      decision,
		"reason":        reason,
		"admin_user_id": adminUserID,
	}).WithOrg(orgID).WithUser(adminUserID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish org verification event", zap.Error(err))
	}
	return nil
}

func (uc *OrgUseCase) SuspendOrganization(ctx context.Context, orgID, reason, adminUserID string) error {
	if err := uc.orgRepo.UpdateStatus(ctx, orgID, "SUSPENDED"); err != nil {
		return err
	}

	evt := events.NewEvent(events.OrganizationSuspended, "organization-service", map[string]string{
		"reason":        reason,
		"admin_user_id": adminUserID,
	}).WithOrg(orgID).WithUser(adminUserID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish org suspended event", zap.Error(err))
	}
	return nil
}

func (uc *OrgUseCase) AddOrgUser(ctx context.Context, orgUser *entity.OrganizationUser) (*entity.OrganizationUser, error) {
	orgUser.ID = uuid.New().String()
	orgUser.Status = "ACTIVE"
	if err := uc.orgUserRepo.Add(ctx, orgUser); err != nil {
		return nil, bzerr.Internal("failed to add organization user", err)
	}

	evt := events.NewEvent(events.OrganizationUserAdded, "organization-service", map[string]string{
		"org_user_id": orgUser.ID,
		"role":        orgUser.Role,
	}).WithOrg(orgUser.OrganizationID).WithUser(orgUser.UserID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish org user added event", zap.Error(err))
	}

	return orgUser, nil
}
