package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/trustinbox/notification-service/internal/domain/entity"
	"github.com/trustinbox/notification-service/internal/domain/repository"
)

type campaignRepo struct {
	db *sql.DB
}

// NewCampaignRepository creates a new CampaignRepository backed by Postgres.
func NewCampaignRepository(db *sql.DB) repository.CampaignRepository {
	return &campaignRepo{db: db}
}

func (r *campaignRepo) Create(ctx context.Context, c *entity.Campaign) error {
	meta, err := json.Marshal(c.Metadata)
	if err != nil {
		return fmt.Errorf("marshal metadata: %w", err)
	}
	now := time.Now().UTC()
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO campaigns
			(id, organization_id, created_by_org_user, name, category, title, body, status, scheduled_at, metadata, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		c.ID, c.OrganizationID, c.CreatedByOrgUser,
		c.Name, c.Category, c.Title, c.Body, c.Status,
		c.ScheduledAt, string(meta), now, now,
	)
	return err
}

func (r *campaignRepo) GetByID(ctx context.Context, id string) (*entity.Campaign, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, organization_id, created_by_org_user, name, category, title, body, status, scheduled_at, metadata, created_at, updated_at
		 FROM campaigns WHERE id = $1`, id)
	return scanCampaign(row)
}

func (r *campaignRepo) ListByOrg(ctx context.Context, orgID string, limit, offset int) ([]entity.Campaign, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM campaigns WHERE organization_id = $1`, orgID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, organization_id, created_by_org_user, name, category, title, body, status, scheduled_at, metadata, created_at, updated_at
		 FROM campaigns WHERE organization_id = $1
		 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		orgID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var campaigns []entity.Campaign
	for rows.Next() {
		c, err := scanCampaignRow(rows)
		if err != nil {
			return nil, 0, err
		}
		campaigns = append(campaigns, *c)
	}
	return campaigns, total, rows.Err()
}

func (r *campaignRepo) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE campaigns SET status = $1, updated_at = $2 WHERE id = $3`,
		status, time.Now().UTC(), id,
	)
	return err
}

func scanCampaign(row *sql.Row) (*entity.Campaign, error) {
	var c entity.Campaign
	var metaRaw string
	var scheduledAt sql.NullTime
	if err := row.Scan(
		&c.ID, &c.OrganizationID, &c.CreatedByOrgUser,
		&c.Name, &c.Category, &c.Title, &c.Body, &c.Status,
		&scheduledAt, &metaRaw, &c.CreatedAt, &c.UpdatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("campaign not found")
		}
		return nil, err
	}
	if scheduledAt.Valid {
		c.ScheduledAt = &scheduledAt.Time
	}
	if err := json.Unmarshal([]byte(metaRaw), &c.Metadata); err != nil {
		c.Metadata = map[string]string{}
	}
	return &c, nil
}

func scanCampaignRow(row rowScanner) (*entity.Campaign, error) {
	var c entity.Campaign
	var metaRaw string
	var scheduledAt sql.NullTime
	if err := row.Scan(
		&c.ID, &c.OrganizationID, &c.CreatedByOrgUser,
		&c.Name, &c.Category, &c.Title, &c.Body, &c.Status,
		&scheduledAt, &metaRaw, &c.CreatedAt, &c.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if scheduledAt.Valid {
		c.ScheduledAt = &scheduledAt.Time
	}
	if err := json.Unmarshal([]byte(metaRaw), &c.Metadata); err != nil {
		c.Metadata = map[string]string{}
	}
	return &c, nil
}
