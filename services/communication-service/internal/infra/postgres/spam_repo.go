package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
)

type spamRepo struct {
	db *sql.DB
}

// NewSpamReportRepository creates a new SpamReportRepository backed by Postgres.
func NewSpamReportRepository(db *sql.DB) repository.SpamReportRepository {
	return &spamRepo{db: db}
}

func (r *spamRepo) Create(ctx context.Context, report *entity.SpamReport) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO spam_reports
			(id, user_id, organization_id, notification_id, callback_request_id, reason, details, status, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		report.ID, report.UserID, report.OrganizationID,
		report.NotificationID, report.CallbackRequestID,
		report.Reason, report.Details, report.Status, report.CreatedAt,
	)
	return err
}

func (r *spamRepo) ListByOrg(ctx context.Context, orgID string, limit, offset int) ([]entity.SpamReport, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM spam_reports WHERE organization_id = $1`, orgID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, organization_id, notification_id, callback_request_id,
		        reason, details, status, created_at
		 FROM spam_reports WHERE organization_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		orgID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []entity.SpamReport
	for rows.Next() {
		var sr entity.SpamReport
		if err := rows.Scan(
			&sr.ID, &sr.UserID, &sr.OrganizationID,
			&sr.NotificationID, &sr.CallbackRequestID,
			&sr.Reason, &sr.Details, &sr.Status, &sr.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		results = append(results, sr)
	}
	return results, total, rows.Err()
}

func (r *spamRepo) UpdateStatus(ctx context.Context, id, status string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE spam_reports SET status = $1 WHERE id = $2`,
		status, id,
	)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("spam report not found: %s", id)
	}
	return nil
}
