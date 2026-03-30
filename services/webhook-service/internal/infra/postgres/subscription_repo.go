package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/webhook-service/internal/domain/entity"
	"github.com/trustinbox/webhook-service/internal/domain/repository"
)

type subscriptionRepo struct {
	db *sql.DB
}

// NewSubscriptionRepository creates a new PostgreSQL-backed WebhookSubscriptionRepository.
func NewSubscriptionRepository(db *sql.DB) repository.WebhookSubscriptionRepository {
	return &subscriptionRepo{db: db}
}

func (r *subscriptionRepo) Create(ctx context.Context, sub *entity.WebhookSubscription) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO webhook_subscriptions (id, service_provider_id, url, events, secret_hash, headers, status, description, retry_policy, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		sub.ID, sub.ServiceProviderID, sub.URL, pq.Array(sub.Events),
		sub.SecretHash, mapToJSON(sub.Headers), string(sub.Status),
		sub.Description, sub.RetryPolicy, sub.CreatedAt, sub.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert webhook subscription: %w", err)
	}
	return nil
}

func (r *subscriptionRepo) GetByID(ctx context.Context, id string) (*entity.WebhookSubscription, error) {
	var sub entity.WebhookSubscription
	var status string
	var headers, retryPolicy sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, service_provider_id, url, events, secret_hash, headers, status, description, retry_policy, created_at, updated_at
		 FROM webhook_subscriptions WHERE id = $1`, id,
	).Scan(&sub.ID, &sub.ServiceProviderID, &sub.URL, pq.Array(&sub.Events),
		&sub.SecretHash, &headers, &status, &sub.Description, &retryPolicy,
		&sub.CreatedAt, &sub.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("webhook_subscription", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get webhook subscription: %w", err)
	}
	sub.Status = entity.WebhookSubscriptionStatus(status)
	sub.Headers = jsonToMap(headers.String)
	sub.RetryPolicy = retryPolicy.String
	return &sub, nil
}

func (r *subscriptionRepo) Update(ctx context.Context, sub *entity.WebhookSubscription) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE webhook_subscriptions
		 SET url=$2, events=$3, secret_hash=$4, headers=$5, status=$6, description=$7, retry_policy=$8, updated_at=$9
		 WHERE id=$1`,
		sub.ID, sub.URL, pq.Array(sub.Events), sub.SecretHash,
		mapToJSON(sub.Headers), string(sub.Status), sub.Description,
		sub.RetryPolicy, sub.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("update webhook subscription: %w", err)
	}
	return nil
}

func (r *subscriptionRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM webhook_subscriptions WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete webhook subscription: %w", err)
	}
	return nil
}

func (r *subscriptionRepo) ListBySP(ctx context.Context, spID string, limit, offset int) ([]*entity.WebhookSubscription, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM webhook_subscriptions WHERE service_provider_id = $1`, spID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count webhook subscriptions: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, service_provider_id, url, events, secret_hash, headers, status, description, retry_policy, created_at, updated_at
		 FROM webhook_subscriptions WHERE service_provider_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		spID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list webhook subscriptions: %w", err)
	}
	defer rows.Close()

	var subs []*entity.WebhookSubscription
	for rows.Next() {
		var sub entity.WebhookSubscription
		var st string
		var headers, retryPolicy sql.NullString
		if err := rows.Scan(&sub.ID, &sub.ServiceProviderID, &sub.URL, pq.Array(&sub.Events),
			&sub.SecretHash, &headers, &st, &sub.Description, &retryPolicy,
			&sub.CreatedAt, &sub.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan webhook subscription: %w", err)
		}
		sub.Status = entity.WebhookSubscriptionStatus(st)
		sub.Headers = jsonToMap(headers.String)
		sub.RetryPolicy = retryPolicy.String
		subs = append(subs, &sub)
	}
	return subs, total, rows.Err()
}

func (r *subscriptionRepo) FindByEvent(ctx context.Context, eventType string) ([]*entity.WebhookSubscription, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, service_provider_id, url, events, secret_hash, headers, status, description, retry_policy, created_at, updated_at
		 FROM webhook_subscriptions WHERE status = 'ACTIVE' AND $1 = ANY(events)`,
		eventType,
	)
	if err != nil {
		return nil, fmt.Errorf("find subscriptions by event: %w", err)
	}
	defer rows.Close()

	var subs []*entity.WebhookSubscription
	for rows.Next() {
		var sub entity.WebhookSubscription
		var st string
		var headers, retryPolicy sql.NullString
		if err := rows.Scan(&sub.ID, &sub.ServiceProviderID, &sub.URL, pq.Array(&sub.Events),
			&sub.SecretHash, &headers, &st, &sub.Description, &retryPolicy,
			&sub.CreatedAt, &sub.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan webhook subscription: %w", err)
		}
		sub.Status = entity.WebhookSubscriptionStatus(st)
		sub.Headers = jsonToMap(headers.String)
		sub.RetryPolicy = retryPolicy.String
		subs = append(subs, &sub)
	}
	return subs, rows.Err()
}
