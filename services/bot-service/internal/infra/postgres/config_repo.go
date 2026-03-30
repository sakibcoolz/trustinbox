package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
)

type configRepo struct {
	db *sql.DB
}

// NewBotConfigurationRepository creates a new PostgreSQL-backed BotConfigurationRepository.
func NewBotConfigurationRepository(db *sql.DB) repository.BotConfigurationRepository {
	return &configRepo{db: db}
}

func (r *configRepo) Get(ctx context.Context, botID string) (*entity.BotConfiguration, error) {
	var c entity.BotConfiguration
	var workingDays []int64
	err := r.db.QueryRowContext(ctx,
		`SELECT bot_id, tone, writing_style, supported_languages, working_hours_start, working_hours_end,
		        working_days, max_turns_before_escalation, escalation_rules, human_handoff_policy,
		        approval_policy, fallback_actions, compliance_restrictions, custom_system_prompt, temperature
		 FROM bot_configurations WHERE bot_id = $1`, botID,
	).Scan(
		&c.BotID, &c.Tone, &c.WritingStyle, pq.Array(&c.SupportedLanguages),
		&c.WorkingHoursStart, &c.WorkingHoursEnd,
		pq.Array(&workingDays), &c.MaxTurnsBeforeEscalation,
		&c.EscalationRules, &c.HumanHandoffPolicy,
		&c.ApprovalPolicy, &c.FallbackActions, &c.ComplianceRestrictions,
		&c.CustomSystemPrompt, &c.Temperature,
	)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("bot_configuration", botID)
	}
	if err != nil {
		return nil, fmt.Errorf("get bot configuration: %w", err)
	}
	c.WorkingDays = make([]int, len(workingDays))
	for i, d := range workingDays {
		c.WorkingDays[i] = int(d)
	}
	return &c, nil
}

func (r *configRepo) Upsert(ctx context.Context, config *entity.BotConfiguration) error {
	workingDays := make([]int64, len(config.WorkingDays))
	for i, d := range config.WorkingDays {
		workingDays[i] = int64(d)
	}
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO bot_configurations (bot_id, tone, writing_style, supported_languages, working_hours_start, working_hours_end,
		        working_days, max_turns_before_escalation, escalation_rules, human_handoff_policy,
		        approval_policy, fallback_actions, compliance_restrictions, custom_system_prompt, temperature, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
		 ON CONFLICT (bot_id) DO UPDATE SET
		    tone = EXCLUDED.tone, writing_style = EXCLUDED.writing_style,
		    supported_languages = EXCLUDED.supported_languages,
		    working_hours_start = EXCLUDED.working_hours_start, working_hours_end = EXCLUDED.working_hours_end,
		    working_days = EXCLUDED.working_days,
		    max_turns_before_escalation = EXCLUDED.max_turns_before_escalation,
		    escalation_rules = EXCLUDED.escalation_rules, human_handoff_policy = EXCLUDED.human_handoff_policy,
		    approval_policy = EXCLUDED.approval_policy, fallback_actions = EXCLUDED.fallback_actions,
		    compliance_restrictions = EXCLUDED.compliance_restrictions,
		    custom_system_prompt = EXCLUDED.custom_system_prompt, temperature = EXCLUDED.temperature,
		    updated_at = NOW()`,
		config.BotID, config.Tone, config.WritingStyle, pq.Array(config.SupportedLanguages),
		config.WorkingHoursStart, config.WorkingHoursEnd,
		pq.Array(workingDays), config.MaxTurnsBeforeEscalation,
		config.EscalationRules, config.HumanHandoffPolicy,
		config.ApprovalPolicy, config.FallbackActions, config.ComplianceRestrictions,
		config.CustomSystemPrompt, config.Temperature,
	)
	if err != nil {
		return fmt.Errorf("upsert bot configuration: %w", err)
	}
	return nil
}
