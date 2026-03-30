package repository

import (
	"context"

	"github.com/trustinbox/notification-service/internal/domain/entity"
)

type NotificationRepository interface {
	Create(ctx context.Context, notif *entity.Notification) error
	GetByID(ctx context.Context, id string) (*entity.Notification, error)
	ListByUser(ctx context.Context, userID string, category string, status string, limit, offset int) ([]entity.Notification, int, error)
	UpdateStatus(ctx context.Context, id, status string) error
	MarkAsRead(ctx context.Context, id, userID string) error
}

type DeliveryRepository interface {
	Create(ctx context.Context, delivery *entity.NotificationDelivery) error
	GetByNotificationID(ctx context.Context, notifID string) (*entity.NotificationDelivery, error)
	UpdateStatus(ctx context.Context, id, status string) error
}

type CampaignRepository interface {
	Create(ctx context.Context, campaign *entity.Campaign) error
	GetByID(ctx context.Context, id string) (*entity.Campaign, error)
	ListBySP(ctx context.Context, spID string, limit, offset int) ([]entity.Campaign, int, error)
	UpdateStatus(ctx context.Context, id, status string) error
}
