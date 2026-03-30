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

func NewMessageRepository(db *sql.DB) repository.MessageRepository {
	return &messageRepo{db: db}
}

func (r *messageRepo) Create(ctx context.Context, msg *entity.Message) error {
	metadata, err := json.Marshal(msg.Metadata)
	if err != nil {
		return fmt.Errorf("marshal metadata: %w", err)
	}
	_, err = r.db.ExecContext(ctx,
		`INSERT INTO messages (id, conversation_id, sender_type, sender_ref_id, message_type, content, metadata, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
		msg.ID, msg.ConversationID, msg.SenderType, nullString(msg.SenderRefID),
		msg.MessageType, msg.Content, metadata,
	)
	if err != nil {
		return fmt.Errorf("create message: %w", err)
	}
	return nil
}

func (r *messageRepo) ListByConversation(ctx context.Context, convID string, limit, offset int) ([]entity.Message, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM messages WHERE conversation_id = $1`, convID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count messages: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, conversation_id, sender_type, sender_ref_id, message_type, content, metadata, created_at
		 FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
		convID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list messages: %w", err)
	}
	defer rows.Close()

	var messages []entity.Message
	for rows.Next() {
		var m entity.Message
		var senderRef sql.NullString
		var metadata []byte
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderType, &senderRef,
			&m.MessageType, &m.Content, &metadata, &m.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan message: %w", err)
		}
		if senderRef.Valid {
			m.SenderRefID = senderRef.String
		}
		if len(metadata) > 0 {
			_ = json.Unmarshal(metadata, &m.Metadata)
		}
		messages = append(messages, m)
	}
	return messages, total, rows.Err()
}
