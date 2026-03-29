package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/domain/repository"
)

type privacyRepo struct {
	db *sql.DB
}

func NewPrivacyPreferenceRepository(db *sql.DB) repository.PrivacyPreferenceRepository {
	return &privacyRepo{db: db}
}

func (r *privacyRepo) Get(ctx context.Context, userID string) (*entity.PrivacyPreference, error) {
	var p entity.PrivacyPreference
	err := r.db.QueryRowContext(ctx,
		`SELECT user_id, allow_personal_notifications, allow_org_notifications,
		        allow_advertisements, allow_callback_requests, allow_chat,
		        allow_document_shares, require_call_approval, created_at, updated_at
		 FROM user_privacy_preferences WHERE user_id = $1`, userID,
	).Scan(
		&p.UserID,
		&p.AllowPersonalNotifications,
		&p.AllowOrgNotifications,
		&p.AllowAdvertisements,
		&p.AllowCallbackRequests,
		&p.AllowChat,
		&p.AllowDocumentShares,
		&p.RequireCallApproval,
		&p.CreatedAt,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("privacy preference not found: %w", err)
	}
	return &p, nil
}

func (r *privacyRepo) Upsert(ctx context.Context, pref *entity.PrivacyPreference) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO user_privacy_preferences
		 (user_id, allow_personal_notifications, allow_org_notifications,
		  allow_advertisements, allow_callback_requests, allow_chat,
		  allow_document_shares, require_call_approval, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		 ON CONFLICT (user_id) DO UPDATE SET
		   allow_personal_notifications = EXCLUDED.allow_personal_notifications,
		   allow_org_notifications       = EXCLUDED.allow_org_notifications,
		   allow_advertisements          = EXCLUDED.allow_advertisements,
		   allow_callback_requests       = EXCLUDED.allow_callback_requests,
		   allow_chat                    = EXCLUDED.allow_chat,
		   allow_document_shares         = EXCLUDED.allow_document_shares,
		   require_call_approval         = EXCLUDED.require_call_approval,
		   updated_at                    = NOW()`,
		pref.UserID,
		pref.AllowPersonalNotifications,
		pref.AllowOrgNotifications,
		pref.AllowAdvertisements,
		pref.AllowCallbackRequests,
		pref.AllowChat,
		pref.AllowDocumentShares,
		pref.RequireCallApproval,
	)
	return err
}
