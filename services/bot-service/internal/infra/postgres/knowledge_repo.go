package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/bot-service/internal/domain/entity"
	"github.com/trustinbox/bot-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
)

type knowledgeRepo struct {
	db *sql.DB
}

// NewKnowledgeSourceRepository creates a new PostgreSQL-backed KnowledgeSourceRepository.
func NewKnowledgeSourceRepository(db *sql.DB) repository.KnowledgeSourceRepository {
	return &knowledgeRepo{db: db}
}

func (r *knowledgeRepo) Create(ctx context.Context, source *entity.KnowledgeSource) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO bot_knowledge_sources (id, bot_id, source_type, name, description, content, s3_key, file_type, file_size, chunk_count, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		source.ID, source.BotID, string(source.SourceType), source.Name, source.Description,
		source.Content, source.S3Key, source.FileType, source.FileSize,
		source.ChunkCount, string(source.Status), source.CreatedAt, source.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert knowledge source: %w", err)
	}
	return nil
}

func (r *knowledgeRepo) GetByID(ctx context.Context, id string) (*entity.KnowledgeSource, error) {
	var s entity.KnowledgeSource
	var sourceType, status string
	err := r.db.QueryRowContext(ctx,
		`SELECT id, bot_id, source_type, name, description, content, s3_key, file_type, file_size, chunk_count, status, created_at, updated_at
		 FROM bot_knowledge_sources WHERE id = $1`, id,
	).Scan(&s.ID, &s.BotID, &sourceType, &s.Name, &s.Description,
		&s.Content, &s.S3Key, &s.FileType, &s.FileSize,
		&s.ChunkCount, &status, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("knowledge_source", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get knowledge source: %w", err)
	}
	s.SourceType = entity.KnowledgeSourceType(sourceType)
	s.Status = entity.KnowledgeSourceStatus(status)
	return &s, nil
}

func (r *knowledgeRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM bot_knowledge_sources WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete knowledge source: %w", err)
	}
	return nil
}

func (r *knowledgeRepo) ListByBot(ctx context.Context, botID string) ([]*entity.KnowledgeSource, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, bot_id, source_type, name, description, content, s3_key, file_type, file_size, chunk_count, status, created_at, updated_at
		 FROM bot_knowledge_sources WHERE bot_id = $1 ORDER BY created_at DESC`, botID,
	)
	if err != nil {
		return nil, fmt.Errorf("list knowledge sources: %w", err)
	}
	defer rows.Close()

	var sources []*entity.KnowledgeSource
	for rows.Next() {
		var s entity.KnowledgeSource
		var sourceType, status string
		if err := rows.Scan(&s.ID, &s.BotID, &sourceType, &s.Name, &s.Description,
			&s.Content, &s.S3Key, &s.FileType, &s.FileSize,
			&s.ChunkCount, &status, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan knowledge source: %w", err)
		}
		s.SourceType = entity.KnowledgeSourceType(sourceType)
		s.Status = entity.KnowledgeSourceStatus(status)
		sources = append(sources, &s)
	}
	return sources, rows.Err()
}

func (r *knowledgeRepo) UpdateStatus(ctx context.Context, id string, status entity.KnowledgeSourceStatus) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE bot_knowledge_sources SET status = $2, updated_at = NOW() WHERE id = $1`,
		id, string(status),
	)
	if err != nil {
		return fmt.Errorf("update knowledge source status: %w", err)
	}
	return nil
}
