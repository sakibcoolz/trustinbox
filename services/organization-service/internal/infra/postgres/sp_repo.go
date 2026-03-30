package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/organization-service/internal/domain/entity"
	"github.com/trustinbox/organization-service/internal/domain/repository"
)

type spRepo struct {
	db *sql.DB
}

func NewServiceProviderRepository(db *sql.DB) repository.ServiceProviderRepository {
	return &spRepo{db: db}
}

func (r *spRepo) Create(ctx context.Context, sp *entity.ServiceProvider) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO service_providers (id, name, legal_name, industry, description, verification_status, status, website, slug, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
		sp.ID, sp.Name, sp.LegalName, sp.Industry, sp.Description,
		sp.VerificationStatus, sp.Status, sp.Website, sp.ID,
	)
	if err != nil {
		return fmt.Errorf("create service provider: %w", err)
	}
	return nil
}

func (r *spRepo) GetByID(ctx context.Context, id string) (*entity.ServiceProvider, error) {
	var sp entity.ServiceProvider
	var legalName, description, website sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, name, legal_name, industry, description, verification_status, status, website, created_at, updated_at
		 FROM service_providers WHERE id = $1`, id,
	).Scan(&sp.ID, &sp.Name, &legalName, &sp.Industry, &description,
		&sp.VerificationStatus, &sp.Status, &website, &sp.CreatedAt, &sp.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get service provider: %w", err)
	}
	if legalName.Valid {
		sp.LegalName = legalName.String
	}
	if description.Valid {
		sp.Description = description.String
	}
	if website.Valid {
		sp.Website = website.String
	}
	return &sp, nil
}

func (r *spRepo) List(ctx context.Context, search string, verificationStatus string, limit, offset int) ([]entity.ServiceProvider, int, error) {
	query := `SELECT id, name, legal_name, industry, description, verification_status, status, website, created_at, updated_at
	          FROM service_providers WHERE 1=1`
	countQuery := `SELECT COUNT(*) FROM service_providers WHERE 1=1`
	args := []interface{}{}
	countArgs := []interface{}{}
	idx := 1

	if search != "" {
		clause := fmt.Sprintf(" AND (name ILIKE $%d OR legal_name ILIKE $%d)", idx, idx)
		query += clause
		countQuery += clause
		pattern := "%" + search + "%"
		args = append(args, pattern)
		countArgs = append(countArgs, pattern)
		idx++
	}
	if verificationStatus != "" {
		clause := fmt.Sprintf(" AND verification_status = $%d", idx)
		query += clause
		countQuery += clause
		args = append(args, verificationStatus)
		countArgs = append(countArgs, verificationStatus)
		idx++
	}

	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count service providers: %w", err)
	}

	query += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", idx, idx+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list service providers: %w", err)
	}
	defer rows.Close()

	var providers []entity.ServiceProvider
	for rows.Next() {
		var sp entity.ServiceProvider
		var legalName, description, website sql.NullString
		if err := rows.Scan(&sp.ID, &sp.Name, &legalName, &sp.Industry, &description,
			&sp.VerificationStatus, &sp.Status, &website, &sp.CreatedAt, &sp.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan service provider: %w", err)
		}
		if legalName.Valid {
			sp.LegalName = legalName.String
		}
		if description.Valid {
			sp.Description = description.String
		}
		if website.Valid {
			sp.Website = website.String
		}
		providers = append(providers, sp)
	}
	return providers, total, rows.Err()
}

func (r *spRepo) Update(ctx context.Context, sp *entity.ServiceProvider) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE service_providers SET name = $1, legal_name = $2, industry = $3, description = $4,
		        website = $5, updated_at = NOW()
		 WHERE id = $6`,
		sp.Name, sp.LegalName, sp.Industry, sp.Description, sp.Website, sp.ID,
	)
	if err != nil {
		return fmt.Errorf("update service provider: %w", err)
	}
	return nil
}

func (r *spRepo) UpdateVerificationStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE service_providers SET verification_status = $1, updated_at = NOW() WHERE id = $2`, status, id,
	)
	if err != nil {
		return fmt.Errorf("update verification status: %w", err)
	}
	return nil
}

func (r *spRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE service_providers SET status = $1, updated_at = NOW() WHERE id = $2`, status, id,
	)
	if err != nil {
		return fmt.Errorf("update status: %w", err)
	}
	return nil
}
