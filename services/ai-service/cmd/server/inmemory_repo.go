package main

import (
	"context"
	"strings"
	"sync"

	"github.com/trustinbox/ai-service/internal/domain/entity"
)

// InMemoryKnowledgeChunkRepo provides an in-memory implementation of the
// KnowledgeChunkRepository for development and testing.
type InMemoryKnowledgeChunkRepo struct {
	mu     sync.RWMutex
	chunks map[string][]entity.KnowledgeChunk // botID -> chunks
}

// NewInMemoryKnowledgeChunkRepo creates a new in-memory chunk repository.
func NewInMemoryKnowledgeChunkRepo() *InMemoryKnowledgeChunkRepo {
	return &InMemoryKnowledgeChunkRepo{
		chunks: make(map[string][]entity.KnowledgeChunk),
	}
}

func (r *InMemoryKnowledgeChunkRepo) Search(ctx context.Context, serviceProviderID, botID, query string, topK int, minScore float64) ([]entity.KnowledgeChunk, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	all := r.chunks[botID]
	total := len(all)

	// Simple keyword-based relevance scoring for development.
	queryLower := strings.ToLower(query)
	var results []entity.KnowledgeChunk
	for _, c := range all {
		contentLower := strings.ToLower(c.Content)
		score := 0.0
		words := strings.Fields(queryLower)
		for _, w := range words {
			if strings.Contains(contentLower, w) {
				score += 1.0 / float64(len(words))
			}
		}
		if score >= minScore {
			chunk := c
			chunk.RelevanceScore = score
			results = append(results, chunk)
		}
	}

	if len(results) > topK {
		results = results[:topK]
	}

	return results, total, nil
}

func (r *InMemoryKnowledgeChunkRepo) Store(ctx context.Context, chunk *entity.KnowledgeChunk) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Determine botID from metadata or default key.
	botID := ""
	if chunk.Metadata != nil {
		botID = chunk.Metadata["bot_id"]
	}
	r.chunks[botID] = append(r.chunks[botID], *chunk)
	return nil
}
