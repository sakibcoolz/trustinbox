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
		`INSERT INTO bots (id, service_provider_id, name, avatar_url, purpose, department, industry_profile_id, status, created_by_sp_user_id, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		bot.ID, bot.ServiceProviderID, bot.Name, bot.AvatarURL, bot.Purpose,
		bot.Department, nullStr(bot.IndustryProfileID), string(bot.Status),
		nullStr(bot.CreatedBySPUserID), bot.CreatedAt, bot.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert bot: %w", err)
	}
	return nil
}

func (r *botRepo) GetByID(ctx context.Context, id string) (*entity.Bot, error) {
	var b entity.Bot
	var status string
	var industryID, createdBy sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, service_provider_id, name, avatar_url, purpose, department, industry_profile_id, status, created_by_sp_user_id, created_at, updated_at
		 FROM bots WHERE id = $1`, id,
	).Scan(&b.ID, &b.ServiceProviderID, &b.Name, &b.AvatarURL, &b.Purpose,
		&b.Department, &industryID, &status, &createdBy, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("bot", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get bot: %w", err)
	}
	b.Status = entity.BotStatus(status)
	b.IndustryProfileID = industryID.String
	b.CreatedBySPUserID = createdBy.String
	return &b, nil
}

func (r *botRepo) Update(ctx context.Context, bot *entity.Bot) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE bots SET name=$2, avatar_url=$3, purpose=$4, department=$5, industry_profile_id=$6, status=$7, updated_at=$8
		 WHERE id=$1`,
		bot.ID, bot.Name, bot.AvatarURL, bot.Purpose, bot.Department,
		nullStr(bot.IndustryProfileID), string(bot.Status), bot.UpdatedAt,
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

func (r *botRepo) ListBySP(ctx context.Context, spID, status string, limit, offset int) ([]*entity.Bot, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM bots WHERE service_provider_id = $1`
	listQuery := `SELECT id, service_provider_id, name, avatar_url, purpose, department, industry_profile_id, status, created_by_sp_user_id, created_at, updated_at
		FROM bots WHERE service_provider_id = $1`

	args := []interface{}{spID}
	if status != "" {
		countQuery += ` AND status = $2`
		listQuery += ` AND status = $2`
		args = append(args, status)
	}

	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count bots: %w", err)
	}

	listQuery += ` ORDER BY created_at DESC LIMIT $` + fmt.Sprintf("%d", len(args)+1) + ` OFFSET $` + fmt.Sprintf("%d", len(args)+2)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list bots: %w", err)
	}
	defer rows.Close()

	var bots []*entity.Bot
	for rows.Next() {
		var b entity.Bot
		var st string
		var industryID, createdBy sql.NullString
		if err := rows.Scan(&b.ID, &b.ServiceProviderID, &b.Name, &b.AvatarURL, &b.Purpose,
			&b.Department, &industryID, &st, &createdBy, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan bot: %w", err)
		}
		b.Status = entity.BotStatus(st)
		b.IndustryProfileID = industryID.String
		b.CreatedBySPUserID = createdBy.String
		bots = append(bots, &b)
	}
	return bots, total, rows.Err()
}

// nullStr returns a sql.NullString; empty string maps to NULL.
func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
