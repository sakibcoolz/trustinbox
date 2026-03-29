package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/trustinbox/notification-service/internal/domain/entity"
	"github.com/trustinbox/notification-service/internal/domain/repository"
)

type notificationRepo struct {
	db *sql.DB
}

// NewNotificationRepository creates a new NotificationRepository backed by Postgres.
func NewNotificationRepository(db *sql.DB) repository.NotificationRepository {
	return &notificationRepo{db: db}
}

func (r *notificationRepo) Create(ctx context.Context, notif *entity.Notification) error {
	meta, err := json.Marshal(notif.Metadata)
	if err != nil {
		return fmt.Errorf("marshal metadata: %w", err)
	}
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO notifications
			(id, user_id, organization_id, category, title, body, priority, status, metadata, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		notif.ID, notif.UserID, notif.OrganizationID,
		notif.Category, notif.Title, notif.Body,
		notif.Priority, notif.Status, string(meta),
		time.Now().UTC(),
	)
	return err
}

func (r *notificationRepo) GetByID(ctx context.Context, id string) (*entity.Notification, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, organization_id, category, title, body, priority, status, metadata, created_at
		 FROM notifications WHERE id = $1`, id)
	return scanNotification(row)
}

func (r *notificationRepo) ListByUser(ctx context.Context, userID, category, status string, limit, offset int) ([]entity.Notification, int, error) {
	args := []interface{}{userID}
	conditions := []string{"user_id = $1"}
	idx := 2

	if category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", idx))
		args = append(args, category)
		idx++
	}
	if status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", idx))
		args = append(args, status)
		idx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	var total int
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	if err := r.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM notifications %s", where),
		countArgs...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	rows, err := r.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT id, user_id, organization_id, category, title, body, priority, status, metadata, created_at
		 FROM notifications %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, idx, idx+1),
		args...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var notifications []entity.Notification
	for rows.Next() {
		n, err := scanNotificationRow(rows)
		if err != nil {
			return nil, 0, err
		}
		notifications = append(notifications, *n)
	}
	return notifications, total, rows.Err()
}

func (r *notificationRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE notifications SET status = $1 WHERE id = $2`,
		status, id,
	)
	return err
}

func (r *notificationRepo) MarkAsRead(ctx context.Context, id, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE notifications SET status = 'READ' WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	return err
}

func scanNotification(row *sql.Row) (*entity.Notification, error) {
	var n entity.Notification
	var metaRaw string
	if err := row.Scan(
		&n.ID, &n.UserID, &n.OrganizationID,
		&n.Category, &n.Title, &n.Body,
		&n.Priority, &n.Status, &metaRaw, &n.CreatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("notification not found")
		}
		return nil, err
	}
	if err := json.Unmarshal([]byte(metaRaw), &n.Metadata); err != nil {
		n.Metadata = map[string]string{}
	}
	return &n, nil
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanNotificationRow(row rowScanner) (*entity.Notification, error) {
	var n entity.Notification
	var metaRaw string
	if err := row.Scan(
		&n.ID, &n.UserID, &n.OrganizationID,
		&n.Category, &n.Title, &n.Body,
		&n.Priority, &n.Status, &metaRaw, &n.CreatedAt,
	); err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(metaRaw), &n.Metadata); err != nil {
		n.Metadata = map[string]string{}
	}
	return &n, nil
}
