package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
)

type documentShareRepo struct {
	db *sql.DB
}

func NewDocumentShareRepository(db *sql.DB) repository.DocumentShareRepository {
	return &documentShareRepo{db: db}
}

func (r *documentShareRepo) Create(ctx context.Context, share *entity.DocumentShare) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO document_shares (id, document_id, user_id, service_provider_id, share_context, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		share.ID, share.DocumentID, share.UserID, share.ServiceProviderID, share.ShareContext,
	)
	if err != nil {
		return fmt.Errorf("create document share: %w", err)
	}
	return nil
}

func (r *documentShareRepo) ListByUser(ctx context.Context, userID string, limit, offset int) ([]entity.DocumentShare, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM document_shares WHERE user_id = $1`, userID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count document shares: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT ds.id, ds.document_id, ds.user_id, ds.service_provider_id, ds.share_context,
		        ds.created_at, ds.opened_at,
		        COALESCE(d.file_name, ''), COALESCE(d.file_type, '')
		 FROM document_shares ds
		 LEFT JOIN documents d ON d.id = ds.document_id
		 WHERE ds.user_id = $1
		 ORDER BY ds.created_at DESC
		 LIMIT $2 OFFSET $3`, userID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list document shares: %w", err)
	}
	defer rows.Close()

	var shares []entity.DocumentShare
	for rows.Next() {
		var s entity.DocumentShare
		if err := rows.Scan(&s.ID, &s.DocumentID, &s.UserID, &s.ServiceProviderID,
			&s.ShareContext, &s.CreatedAt, &s.OpenedAt, &s.FileName, &s.FileType); err != nil {
			return nil, 0, fmt.Errorf("scan document share: %w", err)
		}
		shares = append(shares, s)
	}
	return shares, total, rows.Err()
}

func (r *documentShareRepo) MarkOpened(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE document_shares SET opened_at = NOW() WHERE id = $1`, id,
	)
	if err != nil {
		return fmt.Errorf("mark document share opened: %w", err)
	}
	return nil
}
