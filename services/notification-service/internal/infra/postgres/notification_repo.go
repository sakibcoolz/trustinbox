package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/trustinbox/notification-service/internal/domain/entity"
	"github.com/trustinbox/notification-service/internal/domain/repository"
)

type notificationRepo struct {
	db *sql.DB
}

func NewNotificationRepository(db *sql.DB) repository.NotificationRepository {
	return &notificationRepo{db: db}
}

func (r *notificationRepo) Create(ctx context.Context, notif *entity.Notification) error {
	metadata, err := json.Marshal(notif.Metadata)
	if err != nil {
		return fmt.Errorf("marshal metadata: %w", err)
	}
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO notifications (id, user_id, service_provider_id, category, title, body, priority, status, metadata, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
		notif.ID, notif.UserID, nullString(notif.ServiceProviderID),
		notif.Category, notif.Title, notif.Body, notif.Priority, notif.Status, metadata,
	)
	if err != nil {
		return fmt.Errorf("create notification: %w", err)
	}
	return nil
}

func (r *notificationRepo) GetByID(ctx context.Context, id string) (*entity.Notification, error) {
	var n entity.Notification
	var spID sql.NullString
	var metadata []byte
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, service_provider_id, category, title, body, priority, status, metadata, created_at
		 FROM notifications WHERE id = $1`, id,
	).Scan(&n.ID, &n.UserID, &spID, &n.Category, &n.Title, &n.Body, &n.Priority, &n.Status, &metadata, &n.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get notification: %w", err)
	}
	if spID.Valid {
		n.ServiceProviderID = spID.String
	}
	if len(metadata) > 0 {
		_ = json.Unmarshal(metadata, &n.Metadata)
	}
	return &n, nil
}

func (r *notificationRepo) ListByUser(ctx context.Context, userID string, category string, status string, limit, offset int) ([]entity.Notification, int, error) {
	query := `SELECT id, user_id, service_provider_id, category, title, body, priority, status, metadata, created_at
	          FROM notifications WHERE user_id = $1`
	countQuery := `SELECT COUNT(*) FROM notifications WHERE user_id = $1`
	args := []interface{}{userID}
	countArgs := []interface{}{userID}
	idx := 2

	if category != "" {
		query += fmt.Sprintf(" AND category = $%d", idx)
		countQuery += fmt.Sprintf(" AND category = $%d", idx)
		args = append(args, category)
		countArgs = append(countArgs, category)
		idx++
	}
	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", idx)
		countQuery += fmt.Sprintf(" AND status = $%d", idx)
		args = append(args, status)
		countArgs = append(countArgs, status)
		idx++
	}

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count notifications: %w", err)
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", idx, idx+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list notifications: %w", err)
	}
	defer rows.Close()

	var notifications []entity.Notification
	for rows.Next() {
		var n entity.Notification
		var spID sql.NullString
		var metadata []byte
		if err := rows.Scan(&n.ID, &n.UserID, &spID, &n.Category, &n.Title, &n.Body, &n.Priority, &n.Status, &metadata, &n.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan notification: %w", err)
		}
		if spID.Valid {
			n.ServiceProviderID = spID.String
		}
		if len(metadata) > 0 {
			_ = json.Unmarshal(metadata, &n.Metadata)
		}
		notifications = append(notifications, n)
	}
	return notifications, total, rows.Err()
}

func (r *notificationRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE notifications SET status = $1 WHERE id = $2`, status, id,
	)
	if err != nil {
		return fmt.Errorf("update notification status: %w", err)
	}
	return nil
}

func (r *notificationRepo) MarkAsRead(ctx context.Context, id, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE notifications SET status = 'READ' WHERE id = $1 AND user_id = $2`, id, userID,
	)
	if err != nil {
		return fmt.Errorf("mark notification as read: %w", err)
	}
	return nil
}

func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
