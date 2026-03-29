package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/trustinbox/communication-service/internal/domain/entity"
	"github.com/trustinbox/communication-service/internal/domain/repository"
)

type documentRepo struct {
	db *sql.DB
}

// NewDocumentRepository creates a new DocumentRepository backed by Postgres.
func NewDocumentRepository(db *sql.DB) repository.DocumentRepository {
	return &documentRepo{db: db}
}

func (r *documentRepo) Create(ctx context.Context, doc *entity.Document) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO documents
			(id, organization_id, uploaded_by_org_user, file_name, file_type, s3_key, file_size, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		doc.ID, doc.OrganizationID, doc.UploadedByOrgUser,
		doc.FileName, doc.FileType, doc.S3Key, doc.FileSize,
		time.Now().UTC(),
	)
	return err
}

func (r *documentRepo) GetByID(ctx context.Context, id string) (*entity.Document, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT id, organization_id, uploaded_by_org_user, file_name, file_type, s3_key, file_size, created_at
		 FROM documents WHERE id = $1`, id)
	var doc entity.Document
	if err := row.Scan(
		&doc.ID, &doc.OrganizationID, &doc.UploadedByOrgUser,
		&doc.FileName, &doc.FileType, &doc.S3Key, &doc.FileSize, &doc.CreatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found")
		}
		return nil, err
	}
	return &doc, nil
}

type documentShareRepo struct {
	db *sql.DB
}

// NewDocumentShareRepository creates a new DocumentShareRepository backed by Postgres.
func NewDocumentShareRepository(db *sql.DB) repository.DocumentShareRepository {
	return &documentShareRepo{db: db}
}

func (r *documentShareRepo) Create(ctx context.Context, share *entity.DocumentShare) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO document_shares
			(id, document_id, user_id, organization_id, share_context, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6)`,
		share.ID, share.DocumentID, share.UserID, share.OrganizationID,
		share.ShareContext, time.Now().UTC(),
	)
	return err
}

func (r *documentShareRepo) ListByUser(ctx context.Context, userID string, limit, offset int) ([]entity.DocumentShare, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM document_shares WHERE user_id = $1`, userID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT ds.id, ds.document_id, ds.user_id, ds.organization_id, ds.share_context,
		        ds.created_at, ds.opened_at
		 FROM document_shares ds
		 WHERE ds.user_id = $1
		 ORDER BY ds.created_at DESC LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []entity.DocumentShare
	for rows.Next() {
		var ds entity.DocumentShare
		if err := rows.Scan(
			&ds.ID, &ds.DocumentID, &ds.UserID, &ds.OrganizationID,
			&ds.ShareContext, &ds.CreatedAt, &ds.OpenedAt,
		); err != nil {
			return nil, 0, err
		}
		results = append(results, ds)
	}
	return results, total, rows.Err()
}

func (r *documentShareRepo) MarkOpened(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE document_shares SET opened_at = $1 WHERE id = $2`,
		time.Now().UTC(), id,
	)
	return err
}
