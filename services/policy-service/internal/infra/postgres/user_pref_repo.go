package postgres

import (
	"context"
	"database/sql"

	pq "github.com/lib/pq"
	"github.com/trustinbox/policy-service/internal/domain/entity"
	"github.com/trustinbox/policy-service/internal/domain/repository"
)

type userPrefRepo struct {
	db *sql.DB
}

// NewUserPreferenceRepository creates a new UserPreferenceRepository backed by Postgres.
func NewUserPreferenceRepository(db *sql.DB) repository.UserPreferenceRepository {
	return &userPrefRepo{db: db}
}

func (r *userPrefRepo) GetPreferences(ctx context.Context, userID string) (*entity.UserPreferences, error) {
	prefs := &entity.UserPreferences{UserID: userID}
	err := r.db.QueryRowContext(ctx,
		`SELECT allow_personal_notifications, allow_org_notifications, allow_advertisements,
		        allow_callback_requests, allow_chat, allow_document_shares, require_call_approval
		 FROM user_privacy_preferences WHERE user_id = $1`,
		userID,
	).Scan(
		&prefs.AllowPersonalNotifications,
		&prefs.AllowOrgNotifications,
		&prefs.AllowAdvertisements,
		&prefs.AllowCallbackRequests,
		&prefs.AllowChat,
		&prefs.AllowDocumentShares,
		&prefs.RequireCallApproval,
	)
	if err != nil {
		return nil, err
	}
	return prefs, nil
}

func (r *userPrefRepo) GetDNDRules(ctx context.Context, userID string) ([]entity.DNDRule, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, scope_type, scope_ref_id, start_time, end_time, days_of_week, is_active
		 FROM dnd_rules WHERE user_id = $1 AND is_active = true`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []entity.DNDRule
	for rows.Next() {
		var rule entity.DNDRule
		if err := rows.Scan(
			&rule.ID,
			&rule.UserID,
			&rule.ScopeType,
			&rule.ScopeRefID,
			&rule.StartTime,
			&rule.EndTime,
			pq.Array(&rule.DaysOfWeek),
			&rule.IsActive,
		); err != nil {
			return nil, err
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *userPrefRepo) GetAvailabilitySlots(ctx context.Context, userID string) ([]entity.AvailabilitySlot, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, day_of_week, start_time, end_time, slot_type, is_active
		 FROM availability_slots WHERE user_id = $1 AND is_active = true`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slots []entity.AvailabilitySlot
	for rows.Next() {
		var slot entity.AvailabilitySlot
		if err := rows.Scan(
			&slot.ID,
			&slot.UserID,
			&slot.DayOfWeek,
			&slot.StartTime,
			&slot.EndTime,
			&slot.SlotType,
			&slot.IsActive,
		); err != nil {
			return nil, err
		}
		slots = append(slots, slot)
	}
	return slots, rows.Err()
}

func (r *userPrefRepo) IsOrganizationBlocked(ctx context.Context, userID, orgID string) (bool, error) {
	var count int
	err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM blocked_organizations WHERE user_id = $1 AND organization_id = $2`,
		userID, orgID,
	).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
