package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/trustinbox/notification-service/internal/domain/entity"
	"github.com/trustinbox/notification-service/internal/domain/repository"
)

type deliveryRepo struct {
	db *sql.DB
}

// NewDeliveryRepository creates a new DeliveryRepository backed by Postgres.
func NewDeliveryRepository(db *sql.DB) repository.DeliveryRepository {
	return &deliveryRepo{db: db}
}

func (r *deliveryRepo) Create(ctx context.Context, d *entity.NotificationDelivery) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO notification_deliveries
			(id, notification_id, delivery_channel, delivery_status, delivered_at, read_at, failure_reason, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		d.ID, d.NotificationID, d.DeliveryChannel, d.DeliveryStatus,
		d.DeliveredAt, d.ReadAt, d.FailureReason,
		time.Now().UTC(),
	)
	return err
}

func (r *deliveryRepo) GetByNotificationID(ctx context.Context, notifID string) (*entity.NotificationDelivery, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, notification_id, delivery_channel, delivery_status, delivered_at, read_at, failure_reason, created_at
		 FROM notification_deliveries WHERE notification_id = $1
		 ORDER BY created_at DESC LIMIT 1`, notifID)

	var d entity.NotificationDelivery
	var deliveredAt, readAt sql.NullTime
	var createdAt time.Time
	if err := row.Scan(
		&d.ID, &d.NotificationID, &d.DeliveryChannel, &d.DeliveryStatus,
		&deliveredAt, &readAt, &d.FailureReason, &createdAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("delivery not found for notification: %s", notifID)
		}
		return nil, err
	}
	if deliveredAt.Valid {
		d.DeliveredAt = &deliveredAt.Time
	}
	if readAt.Valid {
		d.ReadAt = &readAt.Time
	}
	return &d, nil
}

func (r *deliveryRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE notification_deliveries SET delivery_status = $1 WHERE id = $2`,
		status, id,
	)
	return err
}
