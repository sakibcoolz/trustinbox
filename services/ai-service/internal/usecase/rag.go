package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/domain/repository"
	"github.com/trustinbox/ai-service/internal/infra/llm"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
)

// RAGPipeline retrieves relevant knowledge chunks and augments prompts.
type RAGPipeline struct {
	chunkRepo repository.KnowledgeChunkRepository
	router    *llm.Router
}

// NewRAGPipeline creates a new RAG pipeline instance.
func NewRAGPipeline(chunkRepo repository.KnowledgeChunkRepository, router *llm.Router) *RAGPipeline {
	return &RAGPipeline{chunkRepo: chunkRepo, router: router}
}

// Query retrieves relevant knowledge and builds an augmented prompt.
func (r *RAGPipeline) Query(ctx context.Context, req *entity.RAGQueryRequest) (*entity.RAGQueryResponse, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "RAGPipeline.Query",
		attribute.String("bot_id", req.BotID),
		attribute.Int("top_k", req.TopK),
	)
	defer span.End()

	topK := req.TopK
	if topK == 0 {
		topK = 5
	}
	minScore := req.MinScore
	if minScore == 0 {
		minScore = 0.7
	}

	chunks, total, err := r.chunkRepo.Search(ctx, req.BotID, req.Query, topK, minScore)
	if err != nil {
		tracing.SetError(ctx, err)
		return nil, fmt.Errorf("knowledge search failed: %w", err)
	}

	augmented := buildAugmentedPrompt(req.Query, chunks)

	return &entity.RAGQueryResponse{
		Chunks:              chunks,
		AugmentedPrompt:     augmented,
		TotalChunksSearched: total,
	}, nil
}

// buildAugmentedPrompt creates a prompt with knowledge context prepended.
func buildAugmentedPrompt(query string, chunks []entity.KnowledgeChunk) string {
	if len(chunks) == 0 {
		return query
	}

	var b strings.Builder
	b.WriteString("Use the following knowledge sources to answer the user's question.\n\n")
	for i, c := range chunks {
		fmt.Fprintf(&b, "--- Source %d: %s (score: %.2f) ---\n%s\n\n", i+1, c.SourceName, c.RelevanceScore, c.Content)
	}
	b.WriteString("User question: ")
	b.WriteString(query)
	return b.String()
}
