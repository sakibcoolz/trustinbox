package repository

import (
	"context"

	"github.com/trustinbox/webhook-service/internal/domain/entity"
)

// WebhookSubscriptionRepository defines persistence for webhook subscriptions.
type WebhookSubscriptionRepository interface {
	Create(ctx context.Context, sub *entity.WebhookSubscription) error
	GetByID(ctx context.Context, id string) (*entity.WebhookSubscription, error)
	Update(ctx context.Context, sub *entity.WebhookSubscription) error
	Delete(ctx context.Context, id string) error
	ListBySP(ctx context.Context, spID string, limit, offset int) ([]*entity.WebhookSubscription, int, error)
	FindByEvent(ctx context.Context, eventType string) ([]*entity.WebhookSubscription, error)
}

// WebhookDeliveryRepository defines persistence for deliveries.
type WebhookDeliveryRepository interface {
	Create(ctx context.Context, delivery *entity.WebhookDelivery) error
	GetByID(ctx context.Context, id string) (*entity.WebhookDelivery, error)
	Update(ctx context.Context, delivery *entity.WebhookDelivery) error
	ListBySubscription(ctx context.Context, subID string, limit, offset int) ([]*entity.WebhookDelivery, int, error)
	GetPendingRetries(ctx context.Context, limit int) ([]*entity.WebhookDelivery, error)
}
