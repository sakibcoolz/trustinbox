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

type SPUseCase struct {
	spRepo     repository.ServiceProviderRepository
	spUserRepo repository.ServiceProviderUserRepository
	publisher  events.Publisher
	log        *zap.Logger
}

func NewSPUseCase(
	spRepo repository.ServiceProviderRepository,
	spUserRepo repository.ServiceProviderUserRepository,
	publisher events.Publisher,
	log *zap.Logger,
) *SPUseCase {
	return &SPUseCase{spRepo: spRepo, spUserRepo: spUserRepo, publisher: publisher, log: log}
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

	// Publish service_provider.created event
	uc.publishEvent(ctx, events.ServiceProviderCreated, sp.ID, adminUserID, sp.ID, map[string]interface{}{
		"service_provider_id": sp.ID,
		"name":                sp.Name,
		"admin_user_id":       adminUserID,
	})

	return sp, nil
}

func (uc *SPUseCase) GetServiceProvider(ctx context.Context, id string) (*entity.ServiceProvider, error) {
	sp, err := uc.spRepo.GetByID(ctx, id)
	if err != nil {
		return nil, bzerr.NotFound("service_provider", id)
	}
	return sp, nil
}

func (uc *SPUseCase) ListServiceProviders(ctx context.Context, search, verificationStatus, serviceMode string, limit, offset int) ([]entity.ServiceProvider, int, error) {
	return uc.spRepo.List(ctx, search, verificationStatus, serviceMode, limit, offset)
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

	if err := uc.spRepo.UpdateVerificationStatus(ctx, spID, status); err != nil {
		return err
	}

	// Publish service_provider.verified event
	uc.publishEvent(ctx, events.ServiceProviderVerified, spID, adminUserID, spID, map[string]interface{}{
		"service_provider_id": spID,
		"decision":            decision,
		"reason":              reason,
		"status":              status,
	})

	return nil
}

func (uc *SPUseCase) UpdateServiceProvider(ctx context.Context, sp *entity.ServiceProvider) (*entity.ServiceProvider, error) {
	ctx, span := tracing.StartSpan(ctx, "organization-service", "UpdateServiceProvider",
		attribute.String("sp_id", sp.ID),
	)
	defer span.End()

	existing, err := uc.spRepo.GetByID(ctx, sp.ID)
	if err != nil {
		return nil, bzerr.NotFound("service_provider", sp.ID)
	}

	if sp.Name != "" {
		existing.Name = sp.Name
	}
	if sp.LegalName != "" {
		existing.LegalName = sp.LegalName
	}
	if sp.Industry != "" {
		existing.Industry = sp.Industry
	}
	if sp.Description != "" {
		existing.Description = sp.Description
	}
	if sp.Website != "" {
		existing.Website = sp.Website
	}
	if sp.ServiceMode != "" {
		existing.ServiceMode = sp.ServiceMode
	}

	if err := uc.spRepo.Update(ctx, existing); err != nil {
		return nil, bzerr.Internal("failed to update service provider", err)
	}

	return existing, nil
}

func (uc *SPUseCase) SuspendServiceProvider(ctx context.Context, spID, reason, adminUserID string) error {
	if err := uc.spRepo.UpdateStatus(ctx, spID, "SUSPENDED"); err != nil {
		return err
	}

	// Publish service_provider.suspended event
	uc.publishEvent(ctx, events.ServiceProviderSuspended, spID, adminUserID, spID, map[string]interface{}{
		"service_provider_id": spID,
		"reason":              reason,
	})

	return nil
}

// publishEvent fires a domain event asynchronously.
func (uc *SPUseCase) publishEvent(ctx context.Context, eventType events.EventType, entityID, actorID, spID string, payload interface{}) {
	if uc.publisher == nil {
		return
	}
	evt, err := events.NewEvent(eventType, payload)
	if err != nil {
		uc.log.Error("failed to create event", zap.String("event_type", string(eventType)), zap.Error(err))
		return
	}
	evt.WithEntity(entityID).WithActor(actorID).WithServiceProvider(spID)
	if err := uc.publisher.Publish(ctx, evt); err != nil {
		uc.log.Error("failed to publish event", zap.String("event_type", string(eventType)), zap.Error(err))
	}
}

func (uc *SPUseCase) AddSPUser(ctx context.Context, spUser *entity.ServiceProviderUser) (*entity.ServiceProviderUser, error) {
	spUser.ID = uuid.New().String()
	spUser.Status = "ACTIVE"
	if err := uc.spUserRepo.Add(ctx, spUser); err != nil {
		return nil, bzerr.Internal("failed to add service provider user", err)
	}
	return spUser, nil
}

func (uc *SPUseCase) GetSPUserByID(ctx context.Context, id string) (*entity.ServiceProviderUser, error) {
	u, err := uc.spUserRepo.GetByID(ctx, id)
	if err != nil {
		return nil, bzerr.NotFound("service_provider_user", id)
	}
	return u, nil
}
