package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
)

type callbackRepo struct {
	db *sql.DB
}

// NewCallbackRequestRepository creates a new CallbackRequestRepository backed by Postgres.
func NewCallbackRequestRepository(db *sql.DB) repository.CallbackRequestRepository {
	return &callbackRepo{db: db}
}

func (r *callbackRepo) Create(ctx context.Context, req *entity.CallbackRequest) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO callback_requests
			(id, user_id, organization_id, requested_by_org_user, reason, details, status, requested_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		req.ID, req.UserID, req.OrganizationID, req.RequestedByOrgUser,
		req.Reason, req.Details, req.Status, req.RequestedAt,
	)
	return err
}

func (r *callbackRepo) GetByID(ctx context.Context, id string) (*entity.CallbackRequest, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, organization_id, requested_by_org_user, reason, details, status,
		        requested_at, responded_at, approved_slot_start, approved_slot_end
		 FROM callback_requests WHERE id = $1`, id)
	return scanCallbackRequest(row)
}

func (r *callbackRepo) ListByUser(ctx context.Context, userID, status string, limit, offset int) ([]entity.CallbackRequest, int, error) {
	return r.list(ctx, "user_id", userID, status, limit, offset)
}

func (r *callbackRepo) ListByOrg(ctx context.Context, orgID, status string, limit, offset int) ([]entity.CallbackRequest, int, error) {
	return r.list(ctx, "organization_id", orgID, status, limit, offset)
}

func (r *callbackRepo) list(ctx context.Context, field, value, statusFilter string, limit, offset int) ([]entity.CallbackRequest, int, error) {
	args := []interface{}{value}
	conditions := []string{fmt.Sprintf("%s = $1", field)}
	idx := 2

	if statusFilter != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", idx))
		args = append(args, statusFilter)
		idx++
	}

	where := "WHERE " + strings.Join(conditions, " AND ")

	var total int
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	if err := r.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM callback_requests %s", where),
		countArgs...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, limit, offset)
	rows, err := r.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT id, user_id, organization_id, requested_by_org_user, reason, details, status,
		        requested_at, responded_at, approved_slot_start, approved_slot_end
		 FROM callback_requests %s ORDER BY requested_at DESC LIMIT $%d OFFSET $%d`, where, idx, idx+1),
		args...,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []entity.CallbackRequest
	for rows.Next() {
		cb, err := scanCallbackRow(rows)
		if err != nil {
			return nil, 0, err
		}
		results = append(results, *cb)
	}
	return results, total, rows.Err()
}

func (r *callbackRepo) Approve(ctx context.Context, id string, slotStart, slotEnd time.Time) error {
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx,
		`UPDATE callback_requests
		 SET status = 'APPROVED', responded_at = $1, approved_slot_start = $2, approved_slot_end = $3
		 WHERE id = $4`,
		now, slotStart, slotEnd, id,
	)
	return err
}

func (r *callbackRepo) Reject(ctx context.Context, id, reason string) error {
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx,
		`UPDATE callback_requests
		 SET status = 'REJECTED', responded_at = $1, details = $2
		 WHERE id = $3`,
		now, reason, id,
	)
	return err
}

func (r *callbackRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE callback_requests SET status = $1 WHERE id = $2`,
		status, id,
	)
	return err
}

type callbackRowScanner interface {
	Scan(dest ...interface{}) error
}

func scanCallbackRequest(row *sql.Row) (*entity.CallbackRequest, error) {
	var cb entity.CallbackRequest
	if err := row.Scan(
		&cb.ID, &cb.UserID, &cb.OrganizationID, &cb.RequestedByOrgUser,
		&cb.Reason, &cb.Details, &cb.Status,
		&cb.RequestedAt, &cb.RespondedAt, &cb.ApprovedSlotStart, &cb.ApprovedSlotEnd,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("callback request not found")
		}
		return nil, err
	}
	return &cb, nil
}

func scanCallbackRow(row callbackRowScanner) (*entity.CallbackRequest, error) {
	var cb entity.CallbackRequest
	if err := row.Scan(
		&cb.ID, &cb.UserID, &cb.OrganizationID, &cb.RequestedByOrgUser,
		&cb.Reason, &cb.Details, &cb.Status,
		&cb.RequestedAt, &cb.RespondedAt, &cb.ApprovedSlotStart, &cb.ApprovedSlotEnd,
	); err != nil {
		return nil, err
	}
	return &cb, nil
}
