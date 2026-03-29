package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/domain/repository"
)

type orgRepo struct {
	db *sql.DB
}

func NewOrganizationRepository(db *sql.DB) repository.OrganizationRepository {
	return &orgRepo{db: db}
}

func (r *orgRepo) Create(ctx context.Context, org *entity.Organization) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO organizations (id, name, legal_name, industry, description, verification_status, status, website, spam_score, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NOW(), NOW())`,
		org.ID, org.Name, org.LegalName, org.Industry, org.Description,
		org.VerificationStatus, org.Status, org.Website,
	)
	if err != nil {
		return fmt.Errorf("failed to create organization: %w", err)
	}
	return nil
}

func (r *orgRepo) GetByID(ctx context.Context, id string) (*entity.Organization, error) {
	org := &entity.Organization{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, legal_name, industry, description, verification_status, status, website, created_at, updated_at
		 FROM organizations WHERE id = $1`, id,
	).Scan(
		&org.ID, &org.Name, &org.LegalName, &org.Industry, &org.Description,
		&org.VerificationStatus, &org.Status, &org.Website,
		&org.CreatedAt, &org.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("organization not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}
	return org, nil
}

func (r *orgRepo) List(ctx context.Context, search string, verificationStatus string, limit, offset int) ([]entity.Organization, int, error) {
	args := []interface{}{}
	argIdx := 1
	where := ""

	if search != "" {
		where += fmt.Sprintf(" WHERE name ILIKE $%d", argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	if verificationStatus != "" {
		if where == "" {
			where += fmt.Sprintf(" WHERE verification_status = $%d", argIdx)
		} else {
			where += fmt.Sprintf(" AND verification_status = $%d", argIdx)
		}
		args = append(args, verificationStatus)
		argIdx++
	}

	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)

	var total int
	if err := r.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM organizations"+where, countArgs...,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count organizations: %w", err)
	}

	query := fmt.Sprintf(
		`SELECT id, name, legal_name, industry, description, verification_status, status, website, created_at, updated_at
		 FROM organizations%s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1,
	)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list organizations: %w", err)
	}
	defer rows.Close()

	var orgs []entity.Organization
	for rows.Next() {
		var org entity.Organization
		if err := rows.Scan(
			&org.ID, &org.Name, &org.LegalName, &org.Industry, &org.Description,
			&org.VerificationStatus, &org.Status, &org.Website,
			&org.CreatedAt, &org.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan organization: %w", err)
		}
		orgs = append(orgs, org)
	}
	return orgs, total, rows.Err()
}

func (r *orgRepo) Update(ctx context.Context, org *entity.Organization) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE organizations SET name=$1, legal_name=$2, industry=$3, description=$4, website=$5, updated_at=NOW()
		 WHERE id=$6`,
		org.Name, org.LegalName, org.Industry, org.Description, org.Website, org.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update organization: %w", err)
	}
	return nil
}

func (r *orgRepo) UpdateVerificationStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE organizations SET verification_status=$1, updated_at=NOW() WHERE id=$2`,
		status, id,
	)
	if err != nil {
		return fmt.Errorf("failed to update verification status: %w", err)
	}
	return nil
}

func (r *orgRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE organizations SET status=$1, updated_at=NOW() WHERE id=$2`,
		status, id,
	)
	if err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}
	return nil
}
