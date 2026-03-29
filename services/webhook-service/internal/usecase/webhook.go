package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/cornerstone/tracing"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/webhook-service/internal/domain/entity"
	"github.com/trustinbox/webhook-service/internal/domain/repository"
	"go.opentelemetry.io/otel/attribute"
)

// WebhookUseCase implements webhook subscription and delivery operations.
type WebhookUseCase struct {
	subRepo      repository.WebhookSubscriptionRepository
	deliveryRepo repository.WebhookDeliveryRepository
}

// NewWebhookUseCase creates a new WebhookUseCase.
func NewWebhookUseCase(
	subRepo repository.WebhookSubscriptionRepository,
	deliveryRepo repository.WebhookDeliveryRepository,
) *WebhookUseCase {
	return &WebhookUseCase{
		subRepo:      subRepo,
		deliveryRepo: deliveryRepo,
	}
}

// CreateSubscription creates a new webhook subscription.
func (uc *WebhookUseCase) CreateSubscription(ctx context.Context, spID, url, description string, events []string) (*entity.WebhookSubscription, string, error) {
	ctx, span := tracing.StartSpan(ctx, "webhook-service", "WebhookUseCase.CreateSubscription",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	if url == "" {
		return nil, "", bizerr.InvalidInput("webhook URL is required")
	}
	if len(events) == 0 {
		return nil, "", bizerr.InvalidInput("at least one event type is required")
	}

	// Validate event types
	validEvents := make(map[string]bool, len(entity.SupportedWebhookEvents))
	for _, e := range entity.SupportedWebhookEvents {
		validEvents[e] = true
	}
	for _, e := range events {
		if !validEvents[e] {
			return nil, "", bizerr.InvalidInput("unsupported event type: " + e)
		}
	}

	// Generate signing secret
	secretBytes := make([]byte, 32)
	if _, err := rand.Read(secretBytes); err != nil {
		return nil, "", bizerr.Internal("failed to generate secret", err)
	}
	secret := hex.EncodeToString(secretBytes)

	sub := &entity.WebhookSubscription{
		ID:                uuid.New().String(),
		ServiceProviderID: spID,
		URL:               url,
		Events:            events,
		SecretHash:        secret, // stored hashed in prod
		Status:            entity.WebhookStatusActive,
		Description:       description,
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}

	if err := uc.subRepo.Create(ctx, sub); err != nil {
		return nil, "", bizerr.Internal("failed to create subscription", err)
	}

	return sub, secret, nil
}

// GetSubscription returns a webhook subscription by ID.
func (uc *WebhookUseCase) GetSubscription(ctx context.Context, subID, spID string) (*entity.WebhookSubscription, error) {
	ctx, span := tracing.StartSpan(ctx, "webhook-service", "WebhookUseCase.GetSubscription",
		attribute.String("subscription_id", subID),
	)
	defer span.End()

	sub, err := uc.subRepo.GetByID(ctx, subID)
	if err != nil {
		return nil, err
	}
	if sub.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("subscription does not belong to this service provider")
	}
	return sub, nil
}

// UpdateSubscription updates webhook subscription fields.
func (uc *WebhookUseCase) UpdateSubscription(ctx context.Context, subID, spID, url, description, status string, events []string) (*entity.WebhookSubscription, error) {
	ctx, span := tracing.StartSpan(ctx, "webhook-service", "WebhookUseCase.UpdateSubscription",
		attribute.String("subscription_id", subID),
	)
	defer span.End()

	sub, err := uc.subRepo.GetByID(ctx, subID)
	if err != nil {
		return nil, err
	}
	if sub.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("subscription does not belong to this service provider")
	}

	if url != "" {
		sub.URL = url
	}
	if description != "" {
		sub.Description = description
	}
	if status != "" {
		sub.Status = entity.WebhookSubscriptionStatus(status)
	}
	if len(events) > 0 {
		sub.Events = events
	}
	sub.UpdatedAt = time.Now().UTC()

	if err := uc.subRepo.Update(ctx, sub); err != nil {
		return nil, bizerr.Internal("failed to update subscription", err)
	}
	return sub, nil
}

// DeleteSubscription removes a webhook subscription.
func (uc *WebhookUseCase) DeleteSubscription(ctx context.Context, subID, spID string) error {
	ctx, span := tracing.StartSpan(ctx, "webhook-service", "WebhookUseCase.DeleteSubscription",
		attribute.String("subscription_id", subID),
	)
	defer span.End()

	sub, err := uc.subRepo.GetByID(ctx, subID)
	if err != nil {
		return err
	}
	if sub.ServiceProviderID != spID {
		return bizerr.Forbidden("subscription does not belong to this service provider")
	}
	return uc.subRepo.Delete(ctx, subID)
}

// ListSubscriptions returns subscriptions for a service provider.
func (uc *WebhookUseCase) ListSubscriptions(ctx context.Context, spID string, limit, offset int) ([]*entity.WebhookSubscription, int, error) {
	ctx, span := tracing.StartSpan(ctx, "webhook-service", "WebhookUseCase.ListSubscriptions",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	return uc.subRepo.ListBySP(ctx, spID, limit, offset)
}

// EnqueueDelivery creates a pending delivery for an event matched to a subscription.
func (uc *WebhookUseCase) EnqueueDelivery(ctx context.Context, subscriptionID, eventType, payload string) (*entity.WebhookDelivery, error) {
	ctx, span := tracing.StartSpan(ctx, "webhook-service", "WebhookUseCase.EnqueueDelivery",
		attribute.String("subscription_id", subscriptionID),
		attribute.String("event_type", eventType),
	)
	defer span.End()

	delivery := &entity.WebhookDelivery{
		ID:             uuid.New().String(),
		SubscriptionID: subscriptionID,
		EventType:      eventType,
		Payload:        payload,
		Attempts:       0,
		MaxRetries:     5,
		Status:         entity.DeliveryPending,
		CreatedAt:      time.Now().UTC(),
	}

	if err := uc.deliveryRepo.Create(ctx, delivery); err != nil {
		return nil, bizerr.Internal("failed to enqueue delivery", err)
	}
	return delivery, nil
}

// DispatchEvent finds all matching subscriptions for an event and enqueues deliveries.
func (uc *WebhookUseCase) DispatchEvent(ctx context.Context, eventType, payload string) (int, error) {
	ctx, span := tracing.StartSpan(ctx, "webhook-service", "WebhookUseCase.DispatchEvent",
		attribute.String("event_type", eventType),
	)
	defer span.End()

	subs, err := uc.subRepo.FindByEvent(ctx, eventType)
	if err != nil {
		return 0, bizerr.Internal("failed to find subscriptions", err)
	}

	count := 0
	for _, sub := range subs {
		if sub.Status != entity.WebhookStatusActive {
			continue
		}
		if _, err := uc.EnqueueDelivery(ctx, sub.ID, eventType, payload); err != nil {
			continue
		}
		count++
	}
	return count, nil
}

// RetryDelivery retries a failed or pending delivery.
func (uc *WebhookUseCase) RetryDelivery(ctx context.Context, deliveryID string) (*entity.WebhookDelivery, error) {
	ctx, span := tracing.StartSpan(ctx, "webhook-service", "WebhookUseCase.RetryDelivery",
		attribute.String("delivery_id", deliveryID),
	)
	defer span.End()

	delivery, err := uc.deliveryRepo.GetByID(ctx, deliveryID)
	if err != nil {
		return nil, err
	}
	if delivery.Status == entity.DeliverySuccess {
		return nil, bizerr.InvalidInput("delivery already succeeded")
	}

	delivery.Status = entity.DeliveryPending
	delivery.Attempts = 0
	now := time.Now().UTC()
	delivery.NextRetryAt = &now

	if err := uc.deliveryRepo.Update(ctx, delivery); err != nil {
		return nil, bizerr.Internal("failed to retry delivery", err)
	}
	return delivery, nil
}

// ListDeliveries returns deliveries for a subscription.
func (uc *WebhookUseCase) ListDeliveries(ctx context.Context, subID string, limit, offset int) ([]*entity.WebhookDelivery, int, error) {
	ctx, span := tracing.StartSpan(ctx, "webhook-service", "WebhookUseCase.ListDeliveries",
		attribute.String("subscription_id", subID),
	)
	defer span.End()

	return uc.deliveryRepo.ListBySubscription(ctx, subID, limit, offset)
}
