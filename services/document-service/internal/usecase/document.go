package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/trustinbox/cornerstone/tracing"
	bizerr "github.com/trustinbox/cornerstone/errors"
	"github.com/trustinbox/document-service/internal/domain/entity"
	"github.com/trustinbox/document-service/internal/domain/repository"
	"github.com/trustinbox/document-service/internal/infra/s3"
	"go.opentelemetry.io/otel/attribute"
)

// DocumentUseCase implements document lifecycle, classification, versioning, and presigned URL operations.
type DocumentUseCase struct {
	docRepo     repository.DocumentRepository
	versionRepo repository.DocumentVersionRepository
	classRepo   repository.DocumentClassificationRepository
	downloadRepo repository.DownloadRecordRepository
	presigner   s3.Presigner
}

// NewDocumentUseCase creates a new DocumentUseCase.
func NewDocumentUseCase(
	docRepo repository.DocumentRepository,
	versionRepo repository.DocumentVersionRepository,
	classRepo repository.DocumentClassificationRepository,
	downloadRepo repository.DownloadRecordRepository,
	presigner s3.Presigner,
) *DocumentUseCase {
	return &DocumentUseCase{
		docRepo:      docRepo,
		versionRepo:  versionRepo,
		classRepo:    classRepo,
		downloadRepo: downloadRepo,
		presigner:    presigner,
	}
}

// CreateDocument creates a new document and its initial version.
func (uc *DocumentUseCase) CreateDocument(ctx context.Context, spID, uploadedBy, fileName, fileType, s3Key string, fileSize int64, classification string) (*entity.Document, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.CreateDocument",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	if fileName == "" {
		return nil, bizerr.InvalidInput("file name is required")
	}
	if s3Key == "" {
		return nil, bizerr.InvalidInput("s3 key is required")
	}

	now := time.Now().UTC()
	doc := &entity.Document{
		ID:                uuid.New().String(),
		ServiceProviderID: spID,
		UploadedBySPUser:  uploadedBy,
		FileName:          fileName,
		FileType:          fileType,
		S3Key:             s3Key,
		FileSize:          fileSize,
		Classification:    classification,
		Status:            entity.DocumentStatusActive,
		CurrentVersion:    1,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := uc.docRepo.Create(ctx, doc); err != nil {
		return nil, bizerr.Internal("failed to create document", err)
	}

	// Create initial version (v1)
	version := &entity.DocumentVersion{
		ID:               uuid.New().String(),
		DocumentID:       doc.ID,
		VersionNumber:    1,
		S3Key:            s3Key,
		FileSize:         fileSize,
		UploadedBySPUser: uploadedBy,
		ChangeSummary:    "Initial upload",
		CreatedAt:        now,
	}
	if err := uc.versionRepo.Create(ctx, version); err != nil {
		return nil, bizerr.Internal("failed to create initial document version", err)
	}

	return doc, nil
}

// GetDocument retrieves a document by ID with SP ownership validation.
func (uc *DocumentUseCase) GetDocument(ctx context.Context, docID, spID string) (*entity.Document, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.GetDocument",
		attribute.String("document_id", docID),
	)
	defer span.End()

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}
	if doc.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("document does not belong to this service provider")
	}
	return doc, nil
}

// UpdateDocument updates a document's metadata.
func (uc *DocumentUseCase) UpdateDocument(ctx context.Context, docID, spID, fileName, classification, status string) (*entity.Document, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.UpdateDocument",
		attribute.String("document_id", docID),
	)
	defer span.End()

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}
	if doc.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("document does not belong to this service provider")
	}

	if fileName != "" {
		doc.FileName = fileName
	}
	if classification != "" {
		doc.Classification = classification
	}
	if status != "" {
		doc.Status = entity.DocumentStatus(status)
	}
	doc.UpdatedAt = time.Now().UTC()

	if err := uc.docRepo.Update(ctx, doc); err != nil {
		return nil, bizerr.Internal("failed to update document", err)
	}
	return doc, nil
}

// ListDocuments returns documents for a service provider with optional filters.
func (uc *DocumentUseCase) ListDocuments(ctx context.Context, spID, status, classification string, limit, offset int) ([]*entity.Document, int, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.ListDocuments",
		attribute.String("service_provider_id", spID),
	)
	defer span.End()

	return uc.docRepo.ListBySP(ctx, spID, status, classification, limit, offset)
}

// DeleteDocument performs a soft delete by setting status to DELETED.
func (uc *DocumentUseCase) DeleteDocument(ctx context.Context, docID, spID string) error {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.DeleteDocument",
		attribute.String("document_id", docID),
	)
	defer span.End()

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return err
	}
	if doc.ServiceProviderID != spID {
		return bizerr.Forbidden("document does not belong to this service provider")
	}

	doc.Status = entity.DocumentStatusDeleted
	doc.UpdatedAt = time.Now().UTC()
	return uc.docRepo.Update(ctx, doc)
}

// GeneratePresignedURL creates a time-limited download URL for a document.
func (uc *DocumentUseCase) GeneratePresignedURL(ctx context.Context, docID, spID string, expiryMinutes int) (string, time.Time, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.GeneratePresignedURL",
		attribute.String("document_id", docID),
	)
	defer span.End()

	if expiryMinutes < 1 || expiryMinutes > 60 {
		return "", time.Time{}, bizerr.InvalidInput("expiry_minutes must be between 1 and 60")
	}

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return "", time.Time{}, err
	}
	if doc.ServiceProviderID != spID {
		return "", time.Time{}, bizerr.Forbidden("document does not belong to this service provider")
	}
	if doc.Status != entity.DocumentStatusActive {
		return "", time.Time{}, bizerr.InvalidInput("cannot generate URL for non-active document")
	}

	expiry := time.Duration(expiryMinutes) * time.Minute
	url, expiresAt, err := uc.presigner.GeneratePresignedURL(ctx, doc.S3Key, expiry)
	if err != nil {
		return "", time.Time{}, bizerr.Internal("failed to generate presigned URL", err)
	}
	return url, expiresAt, nil
}

// ClassifyDocument adds a classification label to a document.
func (uc *DocumentUseCase) ClassifyDocument(ctx context.Context, docID, spID, label string, confidenceScore float64, classifiedBy string) (*entity.DocumentClassification, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.ClassifyDocument",
		attribute.String("document_id", docID),
	)
	defer span.End()

	if label == "" {
		return nil, bizerr.InvalidInput("classification label is required")
	}
	if confidenceScore < 0 || confidenceScore > 1 {
		return nil, bizerr.InvalidInput("confidence score must be between 0 and 1")
	}

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}
	if doc.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("document does not belong to this service provider")
	}

	classification := &entity.DocumentClassification{
		ID:              uuid.New().String(),
		DocumentID:      docID,
		Label:           label,
		ConfidenceScore: confidenceScore,
		ClassifiedBy:    entity.ClassifiedBy(classifiedBy),
		CreatedAt:       time.Now().UTC(),
	}

	if err := uc.classRepo.Create(ctx, classification); err != nil {
		return nil, bizerr.Internal("failed to create classification", err)
	}
	return classification, nil
}

// GetDocumentClassifications returns all classifications for a document.
func (uc *DocumentUseCase) GetDocumentClassifications(ctx context.Context, docID, spID string) ([]*entity.DocumentClassification, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.GetDocumentClassifications",
		attribute.String("document_id", docID),
	)
	defer span.End()

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}
	if doc.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("document does not belong to this service provider")
	}
	return uc.classRepo.ListByDocument(ctx, docID)
}

// CreateDocumentVersion creates a new version of a document.
func (uc *DocumentUseCase) CreateDocumentVersion(ctx context.Context, docID, spID, s3Key string, fileSize int64, uploadedBy, changeSummary string) (*entity.DocumentVersion, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.CreateDocumentVersion",
		attribute.String("document_id", docID),
	)
	defer span.End()

	if s3Key == "" {
		return nil, bizerr.InvalidInput("s3 key is required")
	}

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}
	if doc.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("document does not belong to this service provider")
	}

	newVersionNumber := doc.CurrentVersion + 1
	now := time.Now().UTC()

	version := &entity.DocumentVersion{
		ID:               uuid.New().String(),
		DocumentID:       docID,
		VersionNumber:    newVersionNumber,
		S3Key:            s3Key,
		FileSize:         fileSize,
		UploadedBySPUser: uploadedBy,
		ChangeSummary:    changeSummary,
		CreatedAt:        now,
	}

	if err := uc.versionRepo.Create(ctx, version); err != nil {
		return nil, bizerr.Internal("failed to create document version", err)
	}

	// Update document's current version and s3_key
	doc.CurrentVersion = newVersionNumber
	doc.S3Key = s3Key
	doc.FileSize = fileSize
	doc.UpdatedAt = now
	if err := uc.docRepo.Update(ctx, doc); err != nil {
		return nil, bizerr.Internal("failed to update document version", err)
	}

	return version, nil
}

// ListDocumentVersions returns all versions of a document.
func (uc *DocumentUseCase) ListDocumentVersions(ctx context.Context, docID, spID string, limit, offset int) ([]*entity.DocumentVersion, int, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.ListDocumentVersions",
		attribute.String("document_id", docID),
	)
	defer span.End()

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, 0, err
	}
	if doc.ServiceProviderID != spID {
		return nil, 0, bizerr.Forbidden("document does not belong to this service provider")
	}
	return uc.versionRepo.ListByDocument(ctx, docID, limit, offset)
}

// GetDocumentVersion retrieves a specific version of a document.
func (uc *DocumentUseCase) GetDocumentVersion(ctx context.Context, docID, spID string, versionNumber int) (*entity.DocumentVersion, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.GetDocumentVersion",
		attribute.String("document_id", docID),
	)
	defer span.End()

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}
	if doc.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("document does not belong to this service provider")
	}
	return uc.versionRepo.GetByDocAndVersion(ctx, docID, versionNumber)
}

// TrackDownload records a document download event.
func (uc *DocumentUseCase) TrackDownload(ctx context.Context, docID, spID, downloadedBy string, versionNumber int, ipAddress, userAgent string) (*entity.DownloadRecord, error) {
	ctx, span := tracing.StartSpan(ctx, "document-service", "DocumentUseCase.TrackDownload",
		attribute.String("document_id", docID),
	)
	defer span.End()

	doc, err := uc.docRepo.GetByID(ctx, docID)
	if err != nil {
		return nil, err
	}
	if doc.ServiceProviderID != spID {
		return nil, bizerr.Forbidden("document does not belong to this service provider")
	}

	record := &entity.DownloadRecord{
		ID:               uuid.New().String(),
		DocumentID:       docID,
		DownloadedByUser: downloadedBy,
		VersionNumber:    versionNumber,
		IPAddress:        ipAddress,
		UserAgent:        userAgent,
		CreatedAt:        time.Now().UTC(),
	}

	if err := uc.downloadRepo.Create(ctx, record); err != nil {
		return nil, bizerr.Internal("failed to track download", err)
	}
	return record, nil
}
