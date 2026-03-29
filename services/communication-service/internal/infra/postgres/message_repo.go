package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
)

type messageRepo struct {
	db *sql.DB
}

// NewMessageRepository creates a new MessageRepository backed by Postgres.
func NewMessageRepository(db *sql.DB) repository.MessageRepository {
	return &messageRepo{db: db}
}

func (r *messageRepo) Create(ctx context.Context, msg *entity.Message) error {
	meta, err := json.Marshal(msg.Metadata)
	if err != nil {
		return fmt.Errorf("marshal metadata: %w", err)
	}
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO messages
			(id, conversation_id, sender_type, sender_ref_id, message_type, content, metadata, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		msg.ID, msg.ConversationID, msg.SenderType, msg.SenderRefID,
		msg.MessageType, msg.Content, string(meta), msg.CreatedAt,
	)
	return err
}

func (r *messageRepo) ListByConversation(ctx context.Context, convID string, limit, offset int) ([]entity.Message, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM messages WHERE conversation_id = $1`, convID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, conversation_id, sender_type, sender_ref_id, message_type, content, metadata, created_at
		 FROM messages WHERE conversation_id = $1
		 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
		convID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []entity.Message
	for rows.Next() {
		var msg entity.Message
		var metaRaw string
		if err := rows.Scan(
			&msg.ID, &msg.ConversationID, &msg.SenderType, &msg.SenderRefID,
			&msg.MessageType, &msg.Content, &metaRaw, &msg.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if err := json.Unmarshal([]byte(metaRaw), &msg.Metadata); err != nil {
			msg.Metadata = map[string]string{}
		}
		results = append(results, msg)
	}
	return results, total, rows.Err()
}
