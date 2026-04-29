package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/domain/repository"
)

type dndRepo struct {
	db *sql.DB
}

func NewDNDRuleRepository(db *sql.DB) repository.DNDRuleRepository {
	return &dndRepo{db: db}
}

func (r *dndRepo) ListByUser(ctx context.Context, userID string) ([]entity.DNDRule, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, scope_type, scope_ref_id, start_time, end_time, days_of_week, is_active, created_at
		 FROM dnd_rules WHERE user_id = $1 ORDER BY created_at DESC`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list dnd rules: %w", err)
	}
	defer rows.Close()

	var rules []entity.DNDRule
	for rows.Next() {
		var rule entity.DNDRule
		var scopeRef sql.NullString
		var days []int64
		if err := rows.Scan(
			&rule.ID, &rule.UserID, &rule.ScopeType, &scopeRef,
			&rule.StartTime, &rule.EndTime, pq.Array(&days),
			&rule.IsActive, &rule.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan dnd rule: %w", err)
		}
		if scopeRef.Valid {
			rule.ScopeRefID = scopeRef.String
		}
		for _, d := range days {
			rule.DaysOfWeek = append(rule.DaysOfWeek, int(d))
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *dndRepo) Create(ctx context.Context, rule *entity.DNDRule) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO dnd_rules (id, user_id, scope_type, scope_ref_id, start_time, end_time, days_of_week, is_active, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
		rule.ID, rule.UserID, rule.ScopeType, nullString(rule.ScopeRefID),
		rule.StartTime, rule.EndTime, pq.Array(rule.DaysOfWeek), rule.IsActive,
	)
	if err != nil {
		return fmt.Errorf("create dnd rule: %w", err)
	}
	return nil
}

func (r *dndRepo) Update(ctx context.Context, rule *entity.DNDRule) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE dnd_rules SET scope_type = $1, scope_ref_id = $2, start_time = $3, end_time = $4,
		        days_of_week = $5, is_active = $6
		 WHERE id = $7 AND user_id = $8`,
		rule.ScopeType, nullString(rule.ScopeRefID), rule.StartTime, rule.EndTime,
		pq.Array(rule.DaysOfWeek), rule.IsActive, rule.ID, rule.UserID,
	)
	if err != nil {
		return fmt.Errorf("update dnd rule: %w", err)
	}
	return nil
}

func (r *dndRepo) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM dnd_rules WHERE id = $1 AND user_id = $2`, id, userID,
	)
	if err != nil {
		return fmt.Errorf("delete dnd rule: %w", err)
	}
	return nil
}

func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
