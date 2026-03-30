package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
)

type spamReportRepo struct {
	db *sql.DB
}

func NewSpamReportRepository(db *sql.DB) repository.SpamReportRepository {
	return &spamReportRepo{db: db}
}

func (r *spamReportRepo) Create(ctx context.Context, report *entity.SpamReport) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO spam_reports (id, user_id, service_provider_id, notification_id, callback_request_id, reason, details, status, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
		report.ID, report.UserID, report.ServiceProviderID,
		nullString(report.NotificationID), nullString(report.CallbackRequestID),
		report.Reason, report.Details, report.Status,
	)
	if err != nil {
		return fmt.Errorf("create spam report: %w", err)
	}
	return nil
}

func (r *spamReportRepo) ListBySP(ctx context.Context, spID string, limit, offset int) ([]entity.SpamReport, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM spam_reports WHERE service_provider_id = $1`, spID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count spam reports: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, service_provider_id, notification_id, callback_request_id, reason, details, status, created_at
		 FROM spam_reports WHERE service_provider_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		spID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list spam reports: %w", err)
	}
	defer rows.Close()

	var reports []entity.SpamReport
	for rows.Next() {
		var sr entity.SpamReport
		var notifID, callbackID sql.NullString
		if err := rows.Scan(&sr.ID, &sr.UserID, &sr.ServiceProviderID, &notifID, &callbackID,
			&sr.Reason, &sr.Details, &sr.Status, &sr.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan spam report: %w", err)
		}
		if notifID.Valid {
			sr.NotificationID = notifID.String
		}
		if callbackID.Valid {
			sr.CallbackRequestID = callbackID.String
		}
		reports = append(reports, sr)
	}
	return reports, total, rows.Err()
}

func (r *spamReportRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE spam_reports SET status = $1 WHERE id = $2`, status, id,
	)
	if err != nil {
		return fmt.Errorf("update spam report status: %w", err)
	}
	return nil
}
