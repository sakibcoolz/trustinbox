package repository

import (
	"context"

	"github.com/trustinbox/ai-service/internal/domain/entity"
)

// ConversationRepository manages conversation history for summarization.
type ConversationRepository interface {
	GetMessages(ctx context.Context, conversationID string, limit int) ([]entity.ConversationMessage, error)
	StoreSummary(ctx context.Context, conversationID, summary string) error
}

// KnowledgeChunkRepository manages vector-indexed knowledge chunks for RAG.
type KnowledgeChunkRepository interface {
	Search(ctx context.Context, botID, query string, topK int, minScore float64) ([]entity.KnowledgeChunk, int, error)
	Store(ctx context.Context, chunk *entity.KnowledgeChunk) error
}
