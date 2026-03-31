package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/domain/repository"
)

type invitationRepo struct {
	db *sql.DB
}

func NewInvitationRepository(db *sql.DB) repository.InvitationRepository {
	return &invitationRepo{db: db}
}

func (r *invitationRepo) Create(ctx context.Context, inv *entity.Invitation) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO invitations (id, token_hash, email, service_provider_id, role, status, invited_by, expires_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
		inv.ID, inv.TokenHash, inv.Email, inv.ServiceProviderID, inv.Role, inv.Status, inv.InvitedBy, inv.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("create invitation: %w", err)
	}
	return nil
}

func (r *invitationRepo) GetByTokenHash(ctx context.Context, tokenHash string) (*entity.Invitation, error) {
	var inv entity.Invitation
	err := r.db.QueryRowContext(ctx,
		`SELECT id, token_hash, email, service_provider_id, role, status, invited_by, expires_at, created_at, updated_at
		 FROM invitations WHERE token_hash = $1`, tokenHash,
	).Scan(&inv.ID, &inv.TokenHash, &inv.Email, &inv.ServiceProviderID, &inv.Role, &inv.Status, &inv.InvitedBy, &inv.ExpiresAt, &inv.CreatedAt, &inv.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get invitation by token: %w", err)
	}
	return &inv, nil
}

func (r *invitationRepo) GetByID(ctx context.Context, id string) (*entity.Invitation, error) {
	var inv entity.Invitation
	err := r.db.QueryRowContext(ctx,
		`SELECT id, token_hash, email, service_provider_id, role, status, invited_by, expires_at, created_at, updated_at
		 FROM invitations WHERE id = $1`, id,
	).Scan(&inv.ID, &inv.TokenHash, &inv.Email, &inv.ServiceProviderID, &inv.Role, &inv.Status, &inv.InvitedBy, &inv.ExpiresAt, &inv.CreatedAt, &inv.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get invitation: %w", err)
	}
	return &inv, nil
}

func (r *invitationRepo) ListBySP(ctx context.Context, spID, status string, limit, offset int) ([]entity.Invitation, int, error) {
	var total int
	query := `SELECT COUNT(*) FROM invitations WHERE service_provider_id = $1`
	args := []interface{}{spID}
	if status != "" {
		query += ` AND status = $2`
		args = append(args, status)
	}
	if err := r.db.QueryRowContext(ctx, query, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count invitations: %w", err)
	}

	selectQuery := `SELECT id, token_hash, email, service_provider_id, role, status, invited_by, expires_at, created_at, updated_at
		 FROM invitations WHERE service_provider_id = $1`
	selectArgs := []interface{}{spID}
	paramIdx := 2
	if status != "" {
		selectQuery += fmt.Sprintf(` AND status = $%d`, paramIdx)
		selectArgs = append(selectArgs, status)
		paramIdx++
	}
	selectQuery += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, paramIdx, paramIdx+1)
	selectArgs = append(selectArgs, limit, offset)

	rows, err := r.db.QueryContext(ctx, selectQuery, selectArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list invitations: %w", err)
	}
	defer rows.Close()

	var invitations []entity.Invitation
	for rows.Next() {
		var inv entity.Invitation
		if err := rows.Scan(&inv.ID, &inv.TokenHash, &inv.Email, &inv.ServiceProviderID, &inv.Role, &inv.Status, &inv.InvitedBy, &inv.ExpiresAt, &inv.CreatedAt, &inv.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan invitation: %w", err)
		}
		invitations = append(invitations, inv)
	}
	return invitations, total, rows.Err()
}

func (r *invitationRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE invitations SET status = $1, updated_at = NOW() WHERE id = $2`, status, id,
	)
	if err != nil {
		return fmt.Errorf("update invitation status: %w", err)
	}
	return nil
}

func (r *invitationRepo) GetPendingByEmailAndSP(ctx context.Context, email, spID string) (*entity.Invitation, error) {
	var inv entity.Invitation
	err := r.db.QueryRowContext(ctx,
		`SELECT id, token_hash, email, service_provider_id, role, status, invited_by, expires_at, created_at, updated_at
		 FROM invitations WHERE email = $1 AND service_provider_id = $2 AND status = 'PENDING'`, email, spID,
	).Scan(&inv.ID, &inv.TokenHash, &inv.Email, &inv.ServiceProviderID, &inv.Role, &inv.Status, &inv.InvitedBy, &inv.ExpiresAt, &inv.CreatedAt, &inv.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get pending invitation: %w", err)
	}
	return &inv, nil
}
