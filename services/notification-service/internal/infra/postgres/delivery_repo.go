package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/notification-service/internal/domain/entity"
	"github.com/trustinbox/notification-service/internal/domain/repository"
)

type deliveryRepo struct {
	db *sql.DB
}

func NewDeliveryRepository(db *sql.DB) repository.DeliveryRepository {
	return &deliveryRepo{db: db}
}

func (r *deliveryRepo) Create(ctx context.Context, delivery *entity.NotificationDelivery) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO notification_deliveries (id, notification_id, delivery_channel, delivery_status, failure_reason, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		delivery.ID, delivery.NotificationID, delivery.DeliveryChannel, delivery.DeliveryStatus, delivery.FailureReason,
	)
	if err != nil {
		return fmt.Errorf("create delivery: %w", err)
	}
	return nil
}

func (r *deliveryRepo) GetByNotificationID(ctx context.Context, notifID string) (*entity.NotificationDelivery, error) {
	var d entity.NotificationDelivery
	var failureReason sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, notification_id, delivery_channel, delivery_status, delivered_at, read_at, failure_reason
		 FROM notification_deliveries WHERE notification_id = $1`, notifID,
	).Scan(&d.ID, &d.NotificationID, &d.DeliveryChannel, &d.DeliveryStatus, &d.DeliveredAt, &d.ReadAt, &failureReason)
	if err != nil {
		return nil, fmt.Errorf("get delivery: %w", err)
	}
	if failureReason.Valid {
		d.FailureReason = failureReason.String
	}
	return &d, nil
}

func (r *deliveryRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE notification_deliveries SET delivery_status = $1 WHERE id = $2`, status, id,
	)
	if err != nil {
		return fmt.Errorf("update delivery status: %w", err)
	}
	return nil
}
