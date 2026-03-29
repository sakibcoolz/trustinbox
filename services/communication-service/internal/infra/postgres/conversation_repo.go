package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
)

type conversationRepo struct {
	db *sql.DB
}

// NewConversationRepository creates a new ConversationRepository backed by Postgres.
func NewConversationRepository(db *sql.DB) repository.ConversationRepository {
	return &conversationRepo{db: db}
}

func (r *conversationRepo) Create(ctx context.Context, conv *entity.Conversation) error {
	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO conversations (id, user_id, organization_id, status, created_at, updated_at)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		conv.ID, conv.UserID, conv.OrganizationID, conv.Status, now, now,
	)
	return err
}

func (r *conversationRepo) GetByID(ctx context.Context, id string) (*entity.Conversation, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, organization_id, status, created_at, updated_at
		 FROM conversations WHERE id = $1`, id)
	var conv entity.Conversation
	if err := row.Scan(&conv.ID, &conv.UserID, &conv.OrganizationID, &conv.Status, &conv.CreatedAt, &conv.UpdatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("conversation not found")
		}
		return nil, err
	}
	return &conv, nil
}

func (r *conversationRepo) ListByUser(ctx context.Context, userID string, limit, offset int) ([]entity.Conversation, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM conversations WHERE user_id = $1`, userID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, organization_id, status, created_at, updated_at
		 FROM conversations WHERE user_id = $1
		 ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []entity.Conversation
	for rows.Next() {
		var conv entity.Conversation
		if err := rows.Scan(&conv.ID, &conv.UserID, &conv.OrganizationID, &conv.Status, &conv.CreatedAt, &conv.UpdatedAt); err != nil {
			return nil, 0, err
		}
		results = append(results, conv)
	}
	return results, total, rows.Err()
}

func (r *conversationRepo) Close(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE conversations SET status = 'CLOSED', updated_at = $1 WHERE id = $2`,
		time.Now().UTC(), id,
	)
	return err
}
