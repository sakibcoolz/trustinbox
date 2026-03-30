package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	"github.com/trustinbox/policy-service/internal/domain/entity"
	"github.com/trustinbox/policy-service/internal/domain/repository"
)

type userPrefRepo struct {
	db *sql.DB
}

func NewUserPreferenceRepository(db *sql.DB) repository.UserPreferenceRepository {
	return &userPrefRepo{db: db}
}

func (r *userPrefRepo) GetPreferences(ctx context.Context, userID string) (*entity.UserPreferences, error) {
	var p entity.UserPreferences
	err := r.db.QueryRowContext(ctx,
		`SELECT user_id, allow_personal_notifications, allow_sp_notifications, allow_advertisements,
		        allow_callback_requests, allow_chat, allow_document_shares, require_call_approval
		 FROM privacy_preferences WHERE user_id = $1`, userID,
	).Scan(
		&p.UserID, &p.AllowPersonalNotifications, &p.AllowSPNotifications, &p.AllowAdvertisements,
		&p.AllowCallbackRequests, &p.AllowChat, &p.AllowDocumentShares, &p.RequireCallApproval,
	)
	if err != nil {
		return nil, fmt.Errorf("get user preferences: %w", err)
	}
	return &p, nil
}

func (r *userPrefRepo) GetDNDRules(ctx context.Context, userID string) ([]entity.DNDRule, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, scope_type, scope_ref_id, start_time, end_time, days_of_week, is_active
		 FROM dnd_rules WHERE user_id = $1 AND is_active = true`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("get dnd rules: %w", err)
	}
	defer rows.Close()

	var rules []entity.DNDRule
	for rows.Next() {
		var rule entity.DNDRule
		var scopeRef sql.NullString
		if err := rows.Scan(
			&rule.ID, &rule.UserID, &rule.ScopeType, &scopeRef,
			&rule.StartTime, &rule.EndTime, pq.Array(&rule.DaysOfWeek), &rule.IsActive,
		); err != nil {
			return nil, fmt.Errorf("scan dnd rule: %w", err)
		}
		if scopeRef.Valid {
			rule.ScopeRefID = scopeRef.String
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *userPrefRepo) GetAvailabilitySlots(ctx context.Context, userID string) ([]entity.AvailabilitySlot, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, day_of_week, start_time, end_time, slot_type, is_active
		 FROM availability_slots WHERE user_id = $1 AND is_active = true`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("get availability slots: %w", err)
	}
	defer rows.Close()

	var slots []entity.AvailabilitySlot
	for rows.Next() {
		var s entity.AvailabilitySlot
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.DayOfWeek, &s.StartTime, &s.EndTime, &s.SlotType, &s.IsActive,
		); err != nil {
			return nil, fmt.Errorf("scan availability slot: %w", err)
		}
		slots = append(slots, s)
	}
	return slots, rows.Err()
}

func (r *userPrefRepo) IsServiceProviderBlocked(ctx context.Context, userID, spID string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM blocked_service_providers WHERE user_id = $1 AND service_provider_id = $2)`,
		userID, spID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check blocked sp: %w", err)
	}
	return exists, nil
}
