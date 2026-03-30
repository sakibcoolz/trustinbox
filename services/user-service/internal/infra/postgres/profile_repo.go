package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/user-service/internal/domain/entity"
	"github.com/trustinbox/user-service/internal/domain/repository"
)

type profileRepo struct {
	db *sql.DB
}

func NewUserProfileRepository(db *sql.DB) repository.UserProfileRepository {
	return &profileRepo{db: db}
}

func (r *profileRepo) GetByID(ctx context.Context, userID string) (*entity.UserProfile, error) {
	var p entity.UserProfile
	var avatarURL sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT user_id, full_name, avatar_url, timezone, language, created_at, updated_at
		 FROM user_profiles WHERE user_id = $1`, userID,
	).Scan(&p.UserID, &p.FullName, &avatarURL, &p.Timezone, &p.Language, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get user profile: %w", err)
	}
	p.AvatarURL = avatarURL.String
	return &p, nil
}

func (r *profileRepo) Update(ctx context.Context, profile *entity.UserProfile) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE user_profiles SET full_name = $1, avatar_url = $2, timezone = $3, language = $4, updated_at = NOW()
		 WHERE user_id = $5`,
		profile.FullName, profile.AvatarURL, profile.Timezone, profile.Language, profile.UserID,
	)
	if err != nil {
		return fmt.Errorf("update user profile: %w", err)
	}
	return nil
}
