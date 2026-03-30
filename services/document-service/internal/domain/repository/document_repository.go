package repository

import (
	"context"

	"github.com/trustinbox/document-service/internal/domain/entity"
)

// DocumentRepository manages document persistence.
type DocumentRepository interface {
	Create(ctx context.Context, doc *entity.Document) error
	GetByID(ctx context.Context, id string) (*entity.Document, error)
	Update(ctx context.Context, doc *entity.Document) error
	Delete(ctx context.Context, id string) error
	ListBySP(ctx context.Context, spID, status, classification string, limit, offset int) ([]*entity.Document, int, error)
}

// DocumentVersionRepository manages document version persistence.
type DocumentVersionRepository interface {
	Create(ctx context.Context, version *entity.DocumentVersion) error
	GetByDocAndVersion(ctx context.Context, docID string, versionNumber int) (*entity.DocumentVersion, error)
	ListByDocument(ctx context.Context, docID string, limit, offset int) ([]*entity.DocumentVersion, int, error)
}

// DocumentClassificationRepository manages document classification persistence.
type DocumentClassificationRepository interface {
	Create(ctx context.Context, classification *entity.DocumentClassification) error
	ListByDocument(ctx context.Context, docID string) ([]*entity.DocumentClassification, error)
}

// DownloadRecordRepository manages download tracking persistence.
type DownloadRecordRepository interface {
	Create(ctx context.Context, record *entity.DownloadRecord) error
}
