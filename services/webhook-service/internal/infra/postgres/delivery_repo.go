package postgres

import (
	"context"
	"database/sql"
	"fmt"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/webhook-service/internal/domain/entity"
	"github.com/trustinbox/webhook-service/internal/domain/repository"
)

type deliveryRepo struct {
	db *sql.DB
}

// NewDeliveryRepository creates a new PostgreSQL-backed WebhookDeliveryRepository.
func NewDeliveryRepository(db *sql.DB) repository.WebhookDeliveryRepository {
	return &deliveryRepo{db: db}
}

func (r *deliveryRepo) Create(ctx context.Context, d *entity.WebhookDelivery) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO webhook_deliveries (id, subscription_id, event_type, payload, response_status, response_body, attempts, max_retries, next_retry_at, status, error, delivered_at, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		d.ID, d.SubscriptionID, d.EventType, d.Payload,
		d.ResponseStatus, d.ResponseBody, d.Attempts, d.MaxRetries,
		d.NextRetryAt, string(d.Status), d.Error, d.DeliveredAt, d.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert webhook delivery: %w", err)
	}
	return nil
}

func (r *deliveryRepo) GetByID(ctx context.Context, id string) (*entity.WebhookDelivery, error) {
	var d entity.WebhookDelivery
	var status string
	var responseBody, errMsg sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, subscription_id, event_type, payload, response_status, response_body, attempts, max_retries, next_retry_at, status, error, delivered_at, created_at
		 FROM webhook_deliveries WHERE id = $1`, id,
	).Scan(&d.ID, &d.SubscriptionID, &d.EventType, &d.Payload,
		&d.ResponseStatus, &responseBody, &d.Attempts, &d.MaxRetries,
		&d.NextRetryAt, &status, &errMsg, &d.DeliveredAt, &d.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("webhook_delivery", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get webhook delivery: %w", err)
	}
	d.Status = entity.WebhookDeliveryStatus(status)
	d.ResponseBody = responseBody.String
	d.Error = errMsg.String
	return &d, nil
}

func (r *deliveryRepo) Update(ctx context.Context, d *entity.WebhookDelivery) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE webhook_deliveries
		 SET response_status=$2, response_body=$3, attempts=$4, next_retry_at=$5, status=$6, error=$7, delivered_at=$8
		 WHERE id=$1`,
		d.ID, d.ResponseStatus, nullStr(d.ResponseBody), d.Attempts,
		d.NextRetryAt, string(d.Status), nullStr(d.Error), d.DeliveredAt,
	)
	if err != nil {
		return fmt.Errorf("update webhook delivery: %w", err)
	}
	return nil
}

func (r *deliveryRepo) ListBySubscription(ctx context.Context, subID string, limit, offset int) ([]*entity.WebhookDelivery, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM webhook_deliveries WHERE subscription_id = $1`, subID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count webhook deliveries: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, subscription_id, event_type, payload, response_status, response_body, attempts, max_retries, next_retry_at, status, error, delivered_at, created_at
		 FROM webhook_deliveries WHERE subscription_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		subID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list webhook deliveries: %w", err)
	}
	defer rows.Close()

	var deliveries []*entity.WebhookDelivery
	for rows.Next() {
		var d entity.WebhookDelivery
		var st string
		var responseBody, errMsg sql.NullString
		if err := rows.Scan(&d.ID, &d.SubscriptionID, &d.EventType, &d.Payload,
			&d.ResponseStatus, &responseBody, &d.Attempts, &d.MaxRetries,
			&d.NextRetryAt, &st, &errMsg, &d.DeliveredAt, &d.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan webhook delivery: %w", err)
		}
		d.Status = entity.WebhookDeliveryStatus(st)
		d.ResponseBody = responseBody.String
		d.Error = errMsg.String
		deliveries = append(deliveries, &d)
	}
	return deliveries, total, rows.Err()
}

func (r *deliveryRepo) GetPendingRetries(ctx context.Context, limit int) ([]*entity.WebhookDelivery, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, subscription_id, event_type, payload, response_status, response_body, attempts, max_retries, next_retry_at, status, error, delivered_at, created_at
		 FROM webhook_deliveries
		 WHERE status = 'PENDING' AND (next_retry_at IS NULL OR next_retry_at <= NOW())
		 ORDER BY created_at ASC LIMIT $1`,
		limit,
	)
	if err != nil {
		return nil, fmt.Errorf("get pending retries: %w", err)
	}
	defer rows.Close()

	var deliveries []*entity.WebhookDelivery
	for rows.Next() {
		var d entity.WebhookDelivery
		var st string
		var responseBody, errMsg sql.NullString
		if err := rows.Scan(&d.ID, &d.SubscriptionID, &d.EventType, &d.Payload,
			&d.ResponseStatus, &responseBody, &d.Attempts, &d.MaxRetries,
			&d.NextRetryAt, &st, &errMsg, &d.DeliveredAt, &d.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan webhook delivery: %w", err)
		}
		d.Status = entity.WebhookDeliveryStatus(st)
		d.ResponseBody = responseBody.String
		d.Error = errMsg.String
		deliveries = append(deliveries, &d)
	}
	return deliveries, rows.Err()
}

func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
