package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
)

type botRepo struct {
	db *sql.DB
}

// NewBotRepository creates a new PostgreSQL-backed BotRepository.
func NewBotRepository(db *sql.DB) repository.BotRepository {
	return &botRepo{db: db}
}

func (r *botRepo) Create(ctx context.Context, bot *entity.Bot) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO bots (id, service_provider_id, name, avatar_url, purpose, department, industry_profile_id, status, created_by_sp_user_id, agent_type, manager_bot_id, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		bot.ID, bot.ServiceProviderID, bot.Name, nullStr(bot.AvatarURL), bot.Purpose,
		nullStr(bot.Department), nullStr(bot.IndustryProfileID), string(bot.Status),
		nullStr(bot.CreatedBySPUserID), string(bot.AgentType), nullStr(bot.ManagerBotID),
		bot.CreatedAt, bot.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert bot: %w", err)
	}
	return nil
}

func (r *botRepo) GetByID(ctx context.Context, id string) (*entity.Bot, error) {
	var b entity.Bot
	var status, agentType string
	var avatarURL, department, industryID, createdBy, managerBotID sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, service_provider_id, name, avatar_url, purpose, department, industry_profile_id, status, created_by_sp_user_id, agent_type, manager_bot_id, created_at, updated_at
		 FROM bots WHERE id = $1`, id,
	).Scan(&b.ID, &b.ServiceProviderID, &b.Name, &avatarURL, &b.Purpose,
		&department, &industryID, &status, &createdBy, &agentType, &managerBotID, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("bot", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get bot: %w", err)
	}
	b.AvatarURL = avatarURL.String
	b.Department = department.String
	b.Status = entity.BotStatus(status)
	b.IndustryProfileID = industryID.String
	b.CreatedBySPUserID = createdBy.String
	b.AgentType = entity.AgentType(agentType)
	b.ManagerBotID = managerBotID.String
	return &b, nil
}

func (r *botRepo) Update(ctx context.Context, bot *entity.Bot) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE bots SET name=$2, avatar_url=$3, purpose=$4, department=$5, industry_profile_id=$6, status=$7, agent_type=$8, manager_bot_id=$9, updated_at=$10
		 WHERE id=$1`,
		bot.ID, bot.Name, nullStr(bot.AvatarURL), bot.Purpose, nullStr(bot.Department),
		nullStr(bot.IndustryProfileID), string(bot.Status), string(bot.AgentType),
		nullStr(bot.ManagerBotID), bot.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("update bot: %w", err)
	}
	return nil
}

func (r *botRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM bots WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete bot: %w", err)
	}
	return nil
}

func (r *botRepo) ListBySP(ctx context.Context, spID, status, agentType string, limit, offset int) ([]*entity.Bot, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM bots WHERE service_provider_id = $1`
	listQuery := `SELECT id, service_provider_id, name, avatar_url, purpose, department, industry_profile_id, status, created_by_sp_user_id, agent_type, manager_bot_id, created_at, updated_at
		FROM bots WHERE service_provider_id = $1`

	args := []interface{}{spID}
	if status != "" {
		args = append(args, status)
		countQuery += fmt.Sprintf(" AND status = $%d", len(args))
		listQuery += fmt.Sprintf(" AND status = $%d", len(args))
	}
	if agentType != "" {
		args = append(args, agentType)
		countQuery += fmt.Sprintf(" AND agent_type = $%d", len(args))
		listQuery += fmt.Sprintf(" AND agent_type = $%d", len(args))
	}

	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count bots: %w", err)
	}

	listQuery += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list bots: %w", err)
	}
	defer rows.Close()

	var bots []*entity.Bot
	for rows.Next() {
		var b entity.Bot
		var st, agentType string
		var avatarURL, department, industryID, createdBy, managerBotID sql.NullString
		if err := rows.Scan(&b.ID, &b.ServiceProviderID, &b.Name, &avatarURL, &b.Purpose,
			&department, &industryID, &st, &createdBy, &agentType, &managerBotID, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan bot: %w", err)
		}
		b.AvatarURL = avatarURL.String
		b.Department = department.String
		b.Status = entity.BotStatus(st)
		b.IndustryProfileID = industryID.String
		b.CreatedBySPUserID = createdBy.String
		b.AgentType = entity.AgentType(agentType)
		b.ManagerBotID = managerBotID.String
		bots = append(bots, &b)
	}
	return bots, total, rows.Err()
}

func (r *botRepo) ListByManager(ctx context.Context, managerBotID string) ([]*entity.Bot, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, service_provider_id, name, avatar_url, purpose, department, industry_profile_id, status, created_by_sp_user_id, agent_type, manager_bot_id, created_at, updated_at
		 FROM bots WHERE manager_bot_id = $1 ORDER BY agent_type ASC`, managerBotID,
	)
	if err != nil {
		return nil, fmt.Errorf("list bots by manager: %w", err)
	}
	defer rows.Close()

	var bots []*entity.Bot
	for rows.Next() {
		var b entity.Bot
		var st, agentType string
		var avatarURL, department, industryID, createdBy, mgrID sql.NullString
		if err := rows.Scan(&b.ID, &b.ServiceProviderID, &b.Name, &avatarURL, &b.Purpose,
			&department, &industryID, &st, &createdBy, &agentType, &mgrID, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan bot: %w", err)
		}
		b.AvatarURL = avatarURL.String
		b.Department = department.String
		b.Status = entity.BotStatus(st)
		b.IndustryProfileID = industryID.String
		b.CreatedBySPUserID = createdBy.String
		b.AgentType = entity.AgentType(agentType)
		b.ManagerBotID = mgrID.String
		bots = append(bots, &b)
	}
	return bots, rows.Err()
}

func (r *botRepo) GetManagerBySP(ctx context.Context, spID string) (*entity.Bot, error) {
	var b entity.Bot
	var st, agentType string
	var avatarURL, department, industryID, createdBy, mgrID sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, service_provider_id, name, avatar_url, purpose, department, industry_profile_id, status, created_by_sp_user_id, agent_type, manager_bot_id, created_at, updated_at
		 FROM bots
		 WHERE service_provider_id = $1 AND agent_type = 'MANAGER' AND status = 'ACTIVE'
		 LIMIT 1`, spID,
	).Scan(&b.ID, &b.ServiceProviderID, &b.Name, &avatarURL, &b.Purpose,
		&department, &industryID, &st, &createdBy, &agentType, &mgrID, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("manager bot", spID)
	}
	if err != nil {
		return nil, fmt.Errorf("get manager bot: %w", err)
	}
	b.AvatarURL = avatarURL.String
	b.Department = department.String
	b.Status = entity.BotStatus(st)
	b.IndustryProfileID = industryID.String
	b.CreatedBySPUserID = createdBy.String
	b.AgentType = entity.AgentType(agentType)
	b.ManagerBotID = mgrID.String
	return &b, nil
}

// nullStr returns a sql.NullString; empty string maps to NULL.
func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
