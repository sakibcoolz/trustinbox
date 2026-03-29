package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/policy-service/internal/domain/entity"
	"github.com/trustinbox/policy-service/internal/domain/repository"
)

type orgRepo struct {
	db *sql.DB
}

// NewOrganizationRepository creates a new OrganizationRepository backed by Postgres.
func NewOrganizationRepository(db *sql.DB) repository.OrganizationRepository {
	return &orgRepo{db: db}
}

func (r *orgRepo) GetOrganizationStatus(ctx context.Context, orgID string) (*entity.OrganizationStatus, error) {
	org := &entity.OrganizationStatus{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, verification_status, status, spam_score FROM organizations WHERE id = $1`,
		orgID,
	).Scan(&org.OrganizationID, &org.VerificationStatus, &org.Status, &org.SpamScore)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("organization not found: %s", orgID)
		}
		return nil, err
	}
	return org, nil
}
