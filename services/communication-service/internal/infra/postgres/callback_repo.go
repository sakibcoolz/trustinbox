package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
)

type callbackRepo struct {
	db *sql.DB
}

func NewCallbackRequestRepository(db *sql.DB) repository.CallbackRequestRepository {
	return &callbackRepo{db: db}
}

func (r *callbackRepo) Create(ctx context.Context, req *entity.CallbackRequest) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO callback_requests (id, user_id, service_provider_id, requested_by_sp_user_id, reason, details, status, requested_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		req.ID, req.UserID, req.ServiceProviderID, nullString(req.RequestedBySPUser),
		req.Reason, req.Details, req.Status,
	)
	if err != nil {
		return fmt.Errorf("create callback request: %w", err)
	}
	return nil
}

func (r *callbackRepo) GetByID(ctx context.Context, id string) (*entity.CallbackRequest, error) {
	var c entity.CallbackRequest
	var spUser sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, service_provider_id, requested_by_sp_user_id, reason, details, status,
		        requested_at, responded_at, approved_slot_start, approved_slot_end
		 FROM callback_requests WHERE id = $1`, id,
	).Scan(&c.ID, &c.UserID, &c.ServiceProviderID, &spUser, &c.Reason, &c.Details, &c.Status,
		&c.RequestedAt, &c.RespondedAt, &c.ApprovedSlotStart, &c.ApprovedSlotEnd)
	if err != nil {
		return nil, fmt.Errorf("get callback request: %w", err)
	}
	if spUser.Valid {
		c.RequestedBySPUser = spUser.String
	}
	return &c, nil
}

func (r *callbackRepo) ListByUser(ctx context.Context, userID, status string, limit, offset int) ([]entity.CallbackRequest, int, error) {
	return r.list(ctx, "user_id", userID, status, limit, offset)
}

func (r *callbackRepo) ListBySP(ctx context.Context, spID, status string, limit, offset int) ([]entity.CallbackRequest, int, error) {
	return r.list(ctx, "service_provider_id", spID, status, limit, offset)
}

func (r *callbackRepo) list(ctx context.Context, field, value, status string, limit, offset int) ([]entity.CallbackRequest, int, error) {
	query := fmt.Sprintf(`SELECT id, user_id, service_provider_id, requested_by_sp_user_id, reason, details, status,
	        requested_at, responded_at, approved_slot_start, approved_slot_end
	 FROM callback_requests WHERE %s = $1`, field)
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM callback_requests WHERE %s = $1`, field)
	args := []interface{}{value}
	countArgs := []interface{}{value}
	idx := 2

	if status != "" {
		clause := fmt.Sprintf(" AND status = $%d", idx)
		query += clause
		countQuery += clause
		args = append(args, status)
		countArgs = append(countArgs, status)
		idx++
	}

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count callback requests: %w", err)
	}

	query += fmt.Sprintf(" ORDER BY requested_at DESC LIMIT $%d OFFSET $%d", idx, idx+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list callback requests: %w", err)
	}
	defer rows.Close()

	var requests []entity.CallbackRequest
	for rows.Next() {
		var c entity.CallbackRequest
		var spUser sql.NullString
		if err := rows.Scan(&c.ID, &c.UserID, &c.ServiceProviderID, &spUser, &c.Reason, &c.Details, &c.Status,
			&c.RequestedAt, &c.RespondedAt, &c.ApprovedSlotStart, &c.ApprovedSlotEnd); err != nil {
			return nil, 0, fmt.Errorf("scan callback request: %w", err)
		}
		if spUser.Valid {
			c.RequestedBySPUser = spUser.String
		}
		requests = append(requests, c)
	}
	return requests, total, rows.Err()
}

func (r *callbackRepo) Approve(ctx context.Context, id string, slotStart, slotEnd time.Time) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE callback_requests SET status = 'APPROVED', responded_at = NOW(),
		        approved_slot_start = $1, approved_slot_end = $2
		 WHERE id = $3`,
		slotStart, slotEnd, id,
	)
	if err != nil {
		return fmt.Errorf("approve callback request: %w", err)
	}
	return nil
}

func (r *callbackRepo) Reject(ctx context.Context, id, reason string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE callback_requests SET status = 'REJECTED', responded_at = NOW(), details = $1
		 WHERE id = $2`, reason, id,
	)
	if err != nil {
		return fmt.Errorf("reject callback request: %w", err)
	}
	return nil
}

func (r *callbackRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE callback_requests SET status = $1 WHERE id = $2`, status, id,
	)
	if err != nil {
		return fmt.Errorf("update callback request status: %w", err)
	}
	return nil
}

func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
