package postgres

import (
	"context"
	"database/sql"
	"fmt"

	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/industry-service/internal/domain/entity"
	"github.com/trustinbox/industry-service/internal/domain/repository"
	"github.com/lib/pq"
)

type industryProfileRepo struct {
	db *sql.DB
}

// NewIndustryProfileRepository creates a new PostgreSQL-backed IndustryProfileRepository.
func NewIndustryProfileRepository(db *sql.DB) repository.IndustryProfileRepository {
	return &industryProfileRepo{db: db}
}

func (r *industryProfileRepo) Create(ctx context.Context, p *entity.IndustryProfile) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO industry_profiles (id, industry_key, display_name, description, default_reason_codes, default_templates, default_categories, compliance_hints, document_types, callback_workflows, bot_prompt_pack, dashboard_presets, analytics_presets, is_active, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
		p.ID, p.IndustryKey, p.DisplayName, p.Description,
		nullStr(p.DefaultReasonCodes), nullStr(p.DefaultTemplates),
		pq.Array(p.DefaultCategories),
		nullStr(p.ComplianceHints), nullStr(p.DocumentTypes),
		nullStr(p.CallbackWorkflows), nullStr(p.BotPromptPack),
		nullStr(p.DashboardPresets), nullStr(p.AnalyticsPresets),
		p.IsActive, p.CreatedAt, p.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert industry profile: %w", err)
	}
	return nil
}

func (r *industryProfileRepo) GetByKey(ctx context.Context, industryKey string) (*entity.IndustryProfile, error) {
	var p entity.IndustryProfile
	var reasonCodes, templates, complianceHints, documentTypes sql.NullString
	var callbackWorkflows, botPromptPack, dashboardPresets, analyticsPresets sql.NullString

	err := r.db.QueryRowContext(ctx,
		`SELECT id, industry_key, display_name, description, default_reason_codes, default_templates, default_categories, compliance_hints, document_types, callback_workflows, bot_prompt_pack, dashboard_presets, analytics_presets, is_active, created_at, updated_at
		 FROM industry_profiles WHERE industry_key = $1`, industryKey,
	).Scan(
		&p.ID, &p.IndustryKey, &p.DisplayName, &p.Description,
		&reasonCodes, &templates, pq.Array(&p.DefaultCategories),
		&complianceHints, &documentTypes,
		&callbackWorkflows, &botPromptPack,
		&dashboardPresets, &analyticsPresets,
		&p.IsActive, &p.CreatedAt, &p.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("industry_profile", industryKey)
	}
	if err != nil {
		return nil, fmt.Errorf("get industry profile: %w", err)
	}

	p.DefaultReasonCodes = reasonCodes.String
	p.DefaultTemplates = templates.String
	p.ComplianceHints = complianceHints.String
	p.DocumentTypes = documentTypes.String
	p.CallbackWorkflows = callbackWorkflows.String
	p.BotPromptPack = botPromptPack.String
	p.DashboardPresets = dashboardPresets.String
	p.AnalyticsPresets = analyticsPresets.String

	return &p, nil
}

func (r *industryProfileRepo) Update(ctx context.Context, p *entity.IndustryProfile) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE industry_profiles SET display_name=$2, description=$3, default_reason_codes=$4, default_templates=$5, default_categories=$6, compliance_hints=$7, document_types=$8, callback_workflows=$9, bot_prompt_pack=$10, dashboard_presets=$11, analytics_presets=$12, is_active=$13, updated_at=$14
		 WHERE industry_key=$1`,
		p.IndustryKey, p.DisplayName, p.Description,
		nullStr(p.DefaultReasonCodes), nullStr(p.DefaultTemplates),
		pq.Array(p.DefaultCategories),
		nullStr(p.ComplianceHints), nullStr(p.DocumentTypes),
		nullStr(p.CallbackWorkflows), nullStr(p.BotPromptPack),
		nullStr(p.DashboardPresets), nullStr(p.AnalyticsPresets),
		p.IsActive, p.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("update industry profile: %w", err)
	}
	return nil
}

func (r *industryProfileRepo) List(ctx context.Context, activeOnly bool, limit, offset int) ([]*entity.IndustryProfile, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM industry_profiles`
	listQuery := `SELECT id, industry_key, display_name, description, default_reason_codes, default_templates, default_categories, compliance_hints, document_types, callback_workflows, bot_prompt_pack, dashboard_presets, analytics_presets, is_active, created_at, updated_at
		FROM industry_profiles`

	var args []interface{}
	paramIdx := 1

	if activeOnly {
		countQuery += fmt.Sprintf(` WHERE is_active = $%d`, paramIdx)
		listQuery += fmt.Sprintf(` WHERE is_active = $%d`, paramIdx)
		args = append(args, true)
		paramIdx++
	}

	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count industry profiles: %w", err)
	}

	listQuery += fmt.Sprintf(` ORDER BY industry_key ASC LIMIT $%d OFFSET $%d`, paramIdx, paramIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list industry profiles: %w", err)
	}
	defer rows.Close()

	var profiles []*entity.IndustryProfile
	for rows.Next() {
		var p entity.IndustryProfile
		var reasonCodes, templates, complianceHints, documentTypes sql.NullString
		var callbackWorkflows, botPromptPack, dashboardPresets, analyticsPresets sql.NullString

		if err := rows.Scan(
			&p.ID, &p.IndustryKey, &p.DisplayName, &p.Description,
			&reasonCodes, &templates, pq.Array(&p.DefaultCategories),
			&complianceHints, &documentTypes,
			&callbackWorkflows, &botPromptPack,
			&dashboardPresets, &analyticsPresets,
			&p.IsActive, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan industry profile: %w", err)
		}

		p.DefaultReasonCodes = reasonCodes.String
		p.DefaultTemplates = templates.String
		p.ComplianceHints = complianceHints.String
		p.DocumentTypes = documentTypes.String
		p.CallbackWorkflows = callbackWorkflows.String
		p.BotPromptPack = botPromptPack.String
		p.DashboardPresets = dashboardPresets.String
		p.AnalyticsPresets = analyticsPresets.String

		profiles = append(profiles, &p)
	}
	return profiles, total, rows.Err()
}

// nullStr returns a sql.NullString; empty string maps to NULL.
func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
