package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
)

type permissionRepo struct {
	db *sql.DB
}

// NewBotPermissionRepository creates a new PostgreSQL-backed BotPermissionRepository.
func NewBotPermissionRepository(db *sql.DB) repository.BotPermissionRepository {
	return &permissionRepo{db: db}
}

func (r *permissionRepo) Set(ctx context.Context, perm *entity.BotPermission) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO bot_permissions (id, bot_id, tool_name, is_allowed, constraints, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())
		 ON CONFLICT (bot_id, tool_name) DO UPDATE SET
		    is_allowed = EXCLUDED.is_allowed, constraints = EXCLUDED.constraints`,
		perm.ID, perm.BotID, perm.ToolName, perm.IsAllowed, nullJSON(perm.Constraints),
	)
	if err != nil {
		return fmt.Errorf("set bot permission: %w", err)
	}
	return nil
}

func (r *permissionRepo) ListByBot(ctx context.Context, botID string) ([]*entity.BotPermission, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, bot_id, tool_name, is_allowed, constraints FROM bot_permissions WHERE bot_id = $1 ORDER BY tool_name`, botID,
	)
	if err != nil {
		return nil, fmt.Errorf("list bot permissions: %w", err)
	}
	defer rows.Close()

	var perms []*entity.BotPermission
	for rows.Next() {
		var p entity.BotPermission
		var constraints sql.NullString
		if err := rows.Scan(&p.ID, &p.BotID, &p.ToolName, &p.IsAllowed, &constraints); err != nil {
			return nil, fmt.Errorf("scan bot permission: %w", err)
		}
		p.Constraints = constraints.String
		perms = append(perms, &p)
	}
	return perms, rows.Err()
}

func (r *permissionRepo) IsToolAllowed(ctx context.Context, botID, toolName string) (bool, error) {
	var allowed bool
	err := r.db.QueryRowContext(ctx,
		`SELECT is_allowed FROM bot_permissions WHERE bot_id = $1 AND tool_name = $2`, botID, toolName,
	).Scan(&allowed)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check tool allowed: %w", err)
	}
	return allowed, nil
}

// nullJSON returns a sql.NullString for JSONB; empty string maps to NULL.
func nullJSON(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
