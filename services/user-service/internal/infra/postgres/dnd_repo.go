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
		 FROM dnd_rules WHERE user_id = $1`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to list DND rules: %w", err)
	}
	defer rows.Close()

	var rules []entity.DNDRule
	for rows.Next() {
		var rule entity.DNDRule
		if err := rows.Scan(
			&rule.ID, &rule.UserID, &rule.ScopeType, &rule.ScopeRefID,
			&rule.StartTime, &rule.EndTime, pq.Array(&rule.DaysOfWeek),
			&rule.IsActive, &rule.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan DND rule: %w", err)
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *dndRepo) Create(ctx context.Context, rule *entity.DNDRule) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO dnd_rules (id, user_id, scope_type, scope_ref_id, start_time, end_time, days_of_week, is_active, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
		rule.ID, rule.UserID, rule.ScopeType, rule.ScopeRefID,
		rule.StartTime, rule.EndTime, pq.Array(rule.DaysOfWeek), rule.IsActive,
	)
	return err
}

func (r *dndRepo) Update(ctx context.Context, rule *entity.DNDRule) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE dnd_rules
		 SET start_time = $1, end_time = $2, days_of_week = $3, is_active = $4
		 WHERE id = $5 AND user_id = $6`,
		rule.StartTime, rule.EndTime, pq.Array(rule.DaysOfWeek), rule.IsActive,
		rule.ID, rule.UserID,
	)
	return err
}

func (r *dndRepo) Delete(ctx context.Context, id, userID string) error {
	_, err := r.db.ExecContext(ctx,
		`DELETE FROM dnd_rules WHERE id = $1 AND user_id = $2`, id, userID,
	)
	return err
}
