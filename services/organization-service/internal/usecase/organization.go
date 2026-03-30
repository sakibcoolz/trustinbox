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

type SPUseCase struct {
	spRepo     repository.ServiceProviderRepository
	spUserRepo repository.ServiceProviderUserRepository
	log        *zap.Logger
}

func NewSPUseCase(
	spRepo repository.ServiceProviderRepository,
	spUserRepo repository.ServiceProviderUserRepository,
	log *zap.Logger,
) *SPUseCase {
	return &SPUseCase{spRepo: spRepo, spUserRepo: spUserRepo, log: log}
}

func (uc *SPUseCase) CreateServiceProvider(ctx context.Context, sp *entity.ServiceProvider, adminUserID string) (*entity.ServiceProvider, error) {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "CreateServiceProvider",
		attribute.String("name", sp.Name),
	)
	defer span.End()

	sp.ID = uuid.New().String()
	sp.VerificationStatus = "PENDING"
	sp.Status = "ACTIVE"

	if err := uc.spRepo.Create(ctx, sp); err != nil {
		return nil, bzerr.Internal("failed to create service provider", err)
	}

	// Add admin user
	spUser := &entity.ServiceProviderUser{
		ID:                uuid.New().String(),
		ServiceProviderID: sp.ID,
		UserID:            adminUserID,
		Role:              "SP_ADMIN",
		Status:            "ACTIVE",
	}
	if err := uc.spUserRepo.Add(ctx, spUser); err != nil {
		return nil, bzerr.Internal("failed to add admin user to service provider", err)
	}

	return sp, nil
}

func (uc *SPUseCase) GetServiceProvider(ctx context.Context, id string) (*entity.ServiceProvider, error) {
	sp, err := uc.spRepo.GetByID(ctx, id)
	if err != nil {
		return nil, bzerr.NotFound("service_provider", id)
	}
	return sp, nil
}

func (uc *SPUseCase) ListServiceProviders(ctx context.Context, search, verificationStatus string, limit, offset int) ([]entity.ServiceProvider, int, error) {
	return uc.spRepo.List(ctx, search, verificationStatus, limit, offset)
}

func (uc *SPUseCase) VerifyServiceProvider(ctx context.Context, spID, decision, reason, adminUserID string) error {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "VerifyServiceProvider",
		attribute.String("sp_id", spID),
		attribute.String("decision", decision),
	)
	defer span.End()

	status := "VERIFIED"
	if decision == "REJECTED" {
		status = "REJECTED"
	}

	return uc.spRepo.UpdateVerificationStatus(ctx, spID, status)
}

func (uc *SPUseCase) SuspendServiceProvider(ctx context.Context, spID, reason, adminUserID string) error {
	return uc.spRepo.UpdateStatus(ctx, spID, "SUSPENDED")
}

func (uc *SPUseCase) AddSPUser(ctx context.Context, spUser *entity.ServiceProviderUser) (*entity.ServiceProviderUser, error) {
	spUser.ID = uuid.New().String()
	spUser.Status = "ACTIVE"
	if err := uc.spUserRepo.Add(ctx, spUser); err != nil {
		return nil, bzerr.Internal("failed to add service provider user", err)
	}
	return spUser, nil
}
