package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/domain/repository"
)

// Compile-time interface check.
var _ repository.ConversationRepository = (*ConversationRepository)(nil)

const (
	// messageTTL controls how long message lists are kept in Redis.
	messageTTL = 24 * time.Hour
	// summaryTTL controls how long conversation summaries are cached.
	summaryTTL = 24 * time.Hour
)

// ConversationRepository implements repository.ConversationRepository backed by Redis.
//
// Keys are partitioned by service provider to enforce tenant isolation:
//   - Messages: ai:conv:{serviceProviderID}:{conversationID}:msgs  (Redis List)
//   - Summary:  ai:conv:{serviceProviderID}:{conversationID}:summary (Redis String)
type ConversationRepository struct {
	rdb *redis.Client
}

// NewConversationRepository creates a Redis-backed ConversationRepository.
func NewConversationRepository(rdb *redis.Client) *ConversationRepository {
	return &ConversationRepository{rdb: rdb}
}

// GetMessages returns up to limit messages for the conversation, newest-first ordering.
func (r *ConversationRepository) GetMessages(ctx context.Context, serviceProviderID, conversationID string, limit int) ([]entity.ConversationMessage, error) {
	if serviceProviderID == "" {
		return nil, fmt.Errorf("service_provider_id is required for conversation lookup")
	}
	key := msgKey(serviceProviderID, conversationID)

	raw, err := r.rdb.LRange(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("redis lrange conversation messages: %w", err)
	}

	msgs := make([]entity.ConversationMessage, 0, len(raw))
	for _, s := range raw {
		var m entity.ConversationMessage
		if err := json.Unmarshal([]byte(s), &m); err != nil {
			// Skip malformed entries rather than failing the whole load.
			continue
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

// StoreSummary persists a summary string for the given conversation.
func (r *ConversationRepository) StoreSummary(ctx context.Context, serviceProviderID, conversationID, summary string) error {
	if serviceProviderID == "" {
		return fmt.Errorf("service_provider_id is required for summary storage")
	}
	key := summaryKey(serviceProviderID, conversationID)
	return r.rdb.Set(ctx, key, summary, summaryTTL).Err()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func msgKey(serviceProviderID, conversationID string) string {
	return fmt.Sprintf("ai:conv:%s:%s:msgs", serviceProviderID, conversationID)
}

func summaryKey(serviceProviderID, conversationID string) string {
	return fmt.Sprintf("ai:conv:%s:%s:summary", serviceProviderID, conversationID)
}
