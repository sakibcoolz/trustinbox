package repository

import (
	"context"

	"github.com/trustinbox/webhook-service/internal/domain/entity"
)

// WebhookSubscriptionRepository persists webhook subscriptions.
type WebhookSubscriptionRepository interface {
	Create(ctx context.Context, sub *entity.WebhookSubscription) error
	GetByID(ctx context.Context, id string) (*entity.WebhookSubscription, error)
	ListByOrg(ctx context.Context, orgID string) ([]entity.WebhookSubscription, error)
	ListActiveByEventType(ctx context.Context, eventType string) ([]entity.WebhookSubscription, error)
	Update(ctx context.Context, sub *entity.WebhookSubscription) error
	Delete(ctx context.Context, id string) error
}

// WebhookDeliveryRepository persists webhook delivery attempts.
type WebhookDeliveryRepository interface {
	Create(ctx context.Context, delivery *entity.WebhookDelivery) error
	GetByID(ctx context.Context, id string) (*entity.WebhookDelivery, error)
	ListBySubscription(ctx context.Context, subID string, limit, offset int) ([]entity.WebhookDelivery, int, error)
}
