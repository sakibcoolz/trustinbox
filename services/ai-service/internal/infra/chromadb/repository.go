package chromadb

import (
	"context"
	"fmt"

	"github.com/trustinbox/ai-service/internal/domain/entity"
	"github.com/trustinbox/ai-service/internal/domain/repository"
	"github.com/trustinbox/cornerstone/tracing"
	"go.opentelemetry.io/otel/attribute"
	"go.uber.org/zap"
)

// Compile-time interface check.
var _ repository.KnowledgeChunkRepository = (*Repository)(nil)

// Repository implements repository.KnowledgeChunkRepository backed by ChromaDB.
// Each bot gets its own ChromaDB collection ("trustinbox_bot_{botID}") so
// knowledge from different bots is always isolated.
type Repository struct {
	client *Client
	log    *zap.Logger
}

// NewRepository creates a ChromaDB-backed KnowledgeChunkRepository.
func NewRepository(client *Client, log *zap.Logger) *Repository {
	return &Repository{client: client, log: log}
}

// ─── KnowledgeChunkRepository ────────────────────────────────────────────────

// Search queries the bot's ChromaDB collection using the provided natural
// language query. It generates a real embedding via OpenAI, performs vector
// similarity search in ChromaDB, and filters results below minScore.
//
// Returns (chunks, totalResultsBeforeFilter, error).
func (r *Repository) Search(
	ctx context.Context,
	botID, query string,
	topK int,
	minScore float64,
) ([]entity.KnowledgeChunk, int, error) {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "ChromaRepository.Search",
		attribute.String("bot_id", botID),
		attribute.Int("top_k", topK),
		attribute.Float64("min_score", minScore),
	)
	defer span.End()

	results, err := r.client.Query(ctx, botID, query, topK)
	if err != nil {
		tracing.SetError(ctx, err)
		return nil, 0, fmt.Errorf("chromadb search for bot %s: %w", botID, err)
	}

	total := len(results)

	var chunks []entity.KnowledgeChunk
	for _, res := range results {
		if res.Score < minScore {
			continue
		}
		chunks = append(chunks, entity.KnowledgeChunk{
			ChunkID:        res.ChunkID,
			SourceID:       res.SourceID,
			SourceName:     res.SourceName,
			Content:        res.Content,
			RelevanceScore: res.Score,
			Metadata:       res.Metadata,
		})
	}

	r.log.Debug("chromadb search complete",
		zap.String("bot_id", botID),
		zap.Int("total_candidates", total),
		zap.Int("after_filter", len(chunks)),
		zap.Float64("min_score", minScore),
	)

	return chunks, total, nil
}

// Store generates an embedding for chunk.Content via OpenAI and upserts the
// document into the bot's ChromaDB collection.
// The chunk's bot_id must be present in chunk.Metadata["bot_id"].
func (r *Repository) Store(ctx context.Context, chunk *entity.KnowledgeChunk) error {
	ctx, span := tracing.StartSpan(ctx, "ai-service", "ChromaRepository.Store",
		attribute.String("chunk_id", chunk.ChunkID),
		attribute.String("source_id", chunk.SourceID),
	)
	defer span.End()

	botID := ""
	if chunk.Metadata != nil {
		botID = chunk.Metadata["bot_id"]
	}
	if botID == "" {
		return fmt.Errorf("chunk.Metadata[\"bot_id\"] is required for ChromaDB storage")
	}

	if err := r.client.Add(
		ctx,
		botID,
		chunk.ChunkID,
		chunk.SourceID,
		chunk.SourceName,
		chunk.Content,
		chunk.Metadata,
	); err != nil {
		tracing.SetError(ctx, err)
		return fmt.Errorf("chromadb store chunk %s: %w", chunk.ChunkID, err)
	}

	r.log.Info("knowledge chunk stored in chromadb",
		zap.String("chunk_id", chunk.ChunkID),
		zap.String("source_id", chunk.SourceID),
		zap.String("bot_id", botID),
	)
	return nil
}
