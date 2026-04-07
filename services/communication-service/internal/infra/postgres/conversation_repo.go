package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
)

type conversationRepo struct {
	db *sql.DB
}

func NewConversationRepository(db *sql.DB) repository.ConversationRepository {
	return &conversationRepo{db: db}
}

func (r *conversationRepo) Create(ctx context.Context, conv *entity.Conversation) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO conversations (id, user_id, service_provider_id, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, NOW(), NOW())`,
		conv.ID, conv.UserID, conv.ServiceProviderID, conv.Status,
	)
	if err != nil {
		return fmt.Errorf("create conversation: %w", err)
	}
	return nil
}

func (r *conversationRepo) GetByID(ctx context.Context, id string) (*entity.Conversation, error) {
	var c entity.Conversation
	var userID, spID sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, service_provider_id, status, created_at, updated_at
		 FROM conversations WHERE id = $1`, id,
	).Scan(&c.ID, &userID, &spID, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get conversation: %w", err)
	}
	if userID.Valid {
		c.UserID = userID.String
	}
	if spID.Valid {
		c.ServiceProviderID = spID.String
	}
	return &c, nil
}

func (r *conversationRepo) ListByUser(ctx context.Context, userID string, limit, offset int) ([]entity.Conversation, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT c.id)
		 FROM conversations c
		 LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
		 WHERE c.user_id = $1 OR cp.user_id = $1`, userID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count conversations: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT DISTINCT c.id, c.user_id, c.service_provider_id, c.status, c.created_at, COALESCE(c.updated_at, c.created_at)
		 FROM conversations c
		 LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
		 WHERE c.user_id = $1 OR cp.user_id = $1
		 ORDER BY COALESCE(c.updated_at, c.created_at) DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list conversations: %w", err)
	}
	defer rows.Close()

	var convs []entity.Conversation
	for rows.Next() {
		var c entity.Conversation
		var uID, spID sql.NullString
		if err := rows.Scan(&c.ID, &uID, &spID, &c.Status, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan conversation: %w", err)
		}
		if uID.Valid {
			c.UserID = uID.String
		}
		if spID.Valid {
			c.ServiceProviderID = spID.String
		}
		convs = append(convs, c)
	}
	return convs, total, rows.Err()
}

func (r *conversationRepo) Close(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE conversations SET status = 'CLOSED', updated_at = NOW() WHERE id = $1`, id,
	)
	if err != nil {
		return fmt.Errorf("close conversation: %w", err)
	}
	return nil
}
