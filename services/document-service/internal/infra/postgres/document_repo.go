package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/trustinbox/document-service/internal/domain/entity"
	"github.com/trustinbox/document-service/internal/domain/repository"
	bizerr "github.com/trustinbox/cornerstone/errors"
)

type documentRepo struct {
	db *sql.DB
}

// NewDocumentRepository creates a new PostgreSQL-backed DocumentRepository.
func NewDocumentRepository(db *sql.DB) repository.DocumentRepository {
	return &documentRepo{db: db}
}

func (r *documentRepo) Create(ctx context.Context, doc *entity.Document) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO documents (id, service_provider_id, uploaded_by_sp_user_id, file_name, file_type, s3_key, file_size, classification, status, current_version, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		doc.ID, doc.ServiceProviderID, nullStr(doc.UploadedBySPUser),
		doc.FileName, doc.FileType, doc.S3Key, doc.FileSize,
		nullStr(doc.Classification), string(doc.Status), doc.CurrentVersion,
		doc.CreatedAt, doc.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert document: %w", err)
	}
	return nil
}

func (r *documentRepo) GetByID(ctx context.Context, id string) (*entity.Document, error) {
	var d entity.Document
	var status string
	var uploadedBy, classification sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, service_provider_id, uploaded_by_sp_user_id, file_name, file_type, s3_key, file_size, classification, status, current_version, created_at, updated_at
		 FROM documents WHERE id = $1`, id,
	).Scan(&d.ID, &d.ServiceProviderID, &uploadedBy, &d.FileName, &d.FileType,
		&d.S3Key, &d.FileSize, &classification, &status, &d.CurrentVersion,
		&d.CreatedAt, &d.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("document", id)
	}
	if err != nil {
		return nil, fmt.Errorf("get document: %w", err)
	}
	d.Status = entity.DocumentStatus(status)
	d.UploadedBySPUser = uploadedBy.String
	d.Classification = classification.String
	return &d, nil
}

func (r *documentRepo) Update(ctx context.Context, doc *entity.Document) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE documents SET file_name=$2, file_type=$3, s3_key=$4, file_size=$5, classification=$6, status=$7, current_version=$8, updated_at=$9
		 WHERE id=$1`,
		doc.ID, doc.FileName, doc.FileType, doc.S3Key, doc.FileSize,
		nullStr(doc.Classification), string(doc.Status), doc.CurrentVersion,
		doc.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("update document: %w", err)
	}
	return nil
}

func (r *documentRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM documents WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete document: %w", err)
	}
	return nil
}

func (r *documentRepo) ListBySP(ctx context.Context, spID, status, classification string, limit, offset int) ([]*entity.Document, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM documents WHERE service_provider_id = $1`
	listQuery := `SELECT id, service_provider_id, uploaded_by_sp_user_id, file_name, file_type, s3_key, file_size, classification, status, current_version, created_at, updated_at
		FROM documents WHERE service_provider_id = $1`

	args := []interface{}{spID}
	paramIdx := 2

	if status != "" {
		countQuery += fmt.Sprintf(` AND status = $%d`, paramIdx)
		listQuery += fmt.Sprintf(` AND status = $%d`, paramIdx)
		args = append(args, status)
		paramIdx++
	}
	if classification != "" {
		countQuery += fmt.Sprintf(` AND classification = $%d`, paramIdx)
		listQuery += fmt.Sprintf(` AND classification = $%d`, paramIdx)
		args = append(args, classification)
		paramIdx++
	}

	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count documents: %w", err)
	}

	listQuery += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, paramIdx, paramIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list documents: %w", err)
	}
	defer rows.Close()

	var docs []*entity.Document
	for rows.Next() {
		var d entity.Document
		var st string
		var uploadedBy, classif sql.NullString
		if err := rows.Scan(&d.ID, &d.ServiceProviderID, &uploadedBy, &d.FileName, &d.FileType,
			&d.S3Key, &d.FileSize, &classif, &st, &d.CurrentVersion,
			&d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan document: %w", err)
		}
		d.Status = entity.DocumentStatus(st)
		d.UploadedBySPUser = uploadedBy.String
		d.Classification = classif.String
		docs = append(docs, &d)
	}
	return docs, total, rows.Err()
}

// --- Document Version Repository ---

type versionRepo struct {
	db *sql.DB
}

// NewDocumentVersionRepository creates a new PostgreSQL-backed DocumentVersionRepository.
func NewDocumentVersionRepository(db *sql.DB) repository.DocumentVersionRepository {
	return &versionRepo{db: db}
}

func (r *versionRepo) Create(ctx context.Context, v *entity.DocumentVersion) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO document_versions (id, document_id, version_number, s3_key, file_size, uploaded_by_sp_user_id, change_summary, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		v.ID, v.DocumentID, v.VersionNumber, v.S3Key, v.FileSize,
		nullStr(v.UploadedBySPUser), nullStr(v.ChangeSummary), v.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert document version: %w", err)
	}
	return nil
}

func (r *versionRepo) GetByDocAndVersion(ctx context.Context, docID string, versionNumber int) (*entity.DocumentVersion, error) {
	var v entity.DocumentVersion
	var uploadedBy, changeSummary sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, document_id, version_number, s3_key, file_size, uploaded_by_sp_user_id, change_summary, created_at
		 FROM document_versions WHERE document_id = $1 AND version_number = $2`, docID, versionNumber,
	).Scan(&v.ID, &v.DocumentID, &v.VersionNumber, &v.S3Key, &v.FileSize,
		&uploadedBy, &changeSummary, &v.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, bizerr.NotFound("document_version", fmt.Sprintf("%s/v%d", docID, versionNumber))
	}
	if err != nil {
		return nil, fmt.Errorf("get document version: %w", err)
	}
	v.UploadedBySPUser = uploadedBy.String
	v.ChangeSummary = changeSummary.String
	return &v, nil
}

func (r *versionRepo) ListByDocument(ctx context.Context, docID string, limit, offset int) ([]*entity.DocumentVersion, int, error) {
	var total int
	if err := r.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM document_versions WHERE document_id = $1`, docID,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count document versions: %w", err)
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, document_id, version_number, s3_key, file_size, uploaded_by_sp_user_id, change_summary, created_at
		 FROM document_versions WHERE document_id = $1 ORDER BY version_number DESC LIMIT $2 OFFSET $3`,
		docID, limit, offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list document versions: %w", err)
	}
	defer rows.Close()

	var versions []*entity.DocumentVersion
	for rows.Next() {
		var v entity.DocumentVersion
		var uploadedBy, changeSummary sql.NullString
		if err := rows.Scan(&v.ID, &v.DocumentID, &v.VersionNumber, &v.S3Key, &v.FileSize,
			&uploadedBy, &changeSummary, &v.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan document version: %w", err)
		}
		v.UploadedBySPUser = uploadedBy.String
		v.ChangeSummary = changeSummary.String
		versions = append(versions, &v)
	}
	return versions, total, rows.Err()
}

// --- Document Classification Repository ---

type classificationRepo struct {
	db *sql.DB
}

// NewDocumentClassificationRepository creates a new PostgreSQL-backed DocumentClassificationRepository.
func NewDocumentClassificationRepository(db *sql.DB) repository.DocumentClassificationRepository {
	return &classificationRepo{db: db}
}

func (r *classificationRepo) Create(ctx context.Context, c *entity.DocumentClassification) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO document_classifications (id, document_id, label, confidence_score, classified_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		c.ID, c.DocumentID, c.Label, c.ConfidenceScore,
		string(c.ClassifiedBy), c.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert document classification: %w", err)
	}
	return nil
}

func (r *classificationRepo) ListByDocument(ctx context.Context, docID string) ([]*entity.DocumentClassification, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, document_id, label, confidence_score, classified_by, created_at
		 FROM document_classifications WHERE document_id = $1 ORDER BY created_at DESC`, docID,
	)
	if err != nil {
		return nil, fmt.Errorf("list document classifications: %w", err)
	}
	defer rows.Close()

	var classifications []*entity.DocumentClassification
	for rows.Next() {
		var c entity.DocumentClassification
		var classifiedBy string
		if err := rows.Scan(&c.ID, &c.DocumentID, &c.Label, &c.ConfidenceScore,
			&classifiedBy, &c.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan document classification: %w", err)
		}
		c.ClassifiedBy = entity.ClassifiedBy(classifiedBy)
		classifications = append(classifications, &c)
	}
	return classifications, rows.Err()
}

// --- Download Record Repository ---

type downloadRecordRepo struct {
	db *sql.DB
}

// NewDownloadRecordRepository creates a new PostgreSQL-backed DownloadRecordRepository.
func NewDownloadRecordRepository(db *sql.DB) repository.DownloadRecordRepository {
	return &downloadRecordRepo{db: db}
}

func (r *downloadRecordRepo) Create(ctx context.Context, record *entity.DownloadRecord) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO document_downloads (id, document_id, downloaded_by_user_id, version_number, ip_address, user_agent, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		record.ID, record.DocumentID, record.DownloadedByUser,
		record.VersionNumber, record.IPAddress, record.UserAgent,
		record.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert download record: %w", err)
	}
	return nil
}

// nullStr returns a sql.NullString; empty string maps to NULL.
func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}
