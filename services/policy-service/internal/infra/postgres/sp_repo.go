package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/policy-service/internal/domain/entity"
	"github.com/trustinbox/policy-service/internal/domain/repository"
)

type spRepo struct {
	db *sql.DB
}

func NewServiceProviderRepository(db *sql.DB) repository.ServiceProviderRepository {
	return &spRepo{db: db}
}

func (r *spRepo) GetServiceProviderStatus(ctx context.Context, spID string) (*entity.ServiceProviderStatus, error) {
	var s entity.ServiceProviderStatus
	err := r.db.QueryRowContext(ctx,
		`SELECT id, verification_status, status
		 FROM service_providers WHERE id = $1`, spID,
	).Scan(&s.ServiceProviderID, &s.VerificationStatus, &s.Status)
	if err != nil {
		return nil, fmt.Errorf("get service provider status: %w", err)
	}
	// SpamScore is computed from spam_reports — count open reports as a simple heuristic
	var count int
	_ = r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM spam_reports WHERE service_provider_id = $1 AND status = 'OPEN'`, spID,
	).Scan(&count)
	s.SpamScore = float64(count) * 0.1
	return &s, nil
}
