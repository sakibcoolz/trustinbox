package usecase

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/trustinbox/document-service/internal/domain/entity"
)

// --- Mock repositories ---

type mockDocRepo struct {
	docs map[string]*entity.Document
}

func newMockDocRepo() *mockDocRepo {
	return &mockDocRepo{docs: make(map[string]*entity.Document)}
}

func (m *mockDocRepo) Create(ctx context.Context, doc *entity.Document) error {
	m.docs[doc.ID] = doc
	return nil
}

func (m *mockDocRepo) GetByID(ctx context.Context, id string) (*entity.Document, error) {
	if d, ok := m.docs[id]; ok {
		return d, nil
	}
	return nil, fmt.Errorf("[NOT_FOUND] document not found: %s", id)
}

func (m *mockDocRepo) Update(ctx context.Context, doc *entity.Document) error {
	m.docs[doc.ID] = doc
	return nil
}

func (m *mockDocRepo) Delete(ctx context.Context, id string) error {
	delete(m.docs, id)
	return nil
}

func (m *mockDocRepo) ListBySP(ctx context.Context, spID, status, classification string, limit, offset int) ([]*entity.Document, int, error) {
	var result []*entity.Document
	for _, d := range m.docs {
		if d.ServiceProviderID != spID {
			continue
		}
		if status != "" && string(d.Status) != status {
			continue
		}
		if classification != "" && d.Classification != classification {
			continue
		}
		result = append(result, d)
	}
	return result, len(result), nil
}

type mockVersionRepo struct {
	versions map[string]*entity.DocumentVersion
}

func newMockVersionRepo() *mockVersionRepo {
	return &mockVersionRepo{versions: make(map[string]*entity.DocumentVersion)}
}

func (m *mockVersionRepo) Create(ctx context.Context, v *entity.DocumentVersion) error {
	key := fmt.Sprintf("%s/v%d", v.DocumentID, v.VersionNumber)
	m.versions[key] = v
	return nil
}

func (m *mockVersionRepo) GetByDocAndVersion(ctx context.Context, docID string, versionNumber int) (*entity.DocumentVersion, error) {
	key := fmt.Sprintf("%s/v%d", docID, versionNumber)
	if v, ok := m.versions[key]; ok {
		return v, nil
	}
	return nil, fmt.Errorf("[NOT_FOUND] document_version not found: %s", key)
}

func (m *mockVersionRepo) ListByDocument(ctx context.Context, docID string, limit, offset int) ([]*entity.DocumentVersion, int, error) {
	var result []*entity.DocumentVersion
	for _, v := range m.versions {
		if v.DocumentID == docID {
			result = append(result, v)
		}
	}
	return result, len(result), nil
}

type mockClassRepo struct {
	classifications map[string]*entity.DocumentClassification
}

func newMockClassRepo() *mockClassRepo {
	return &mockClassRepo{classifications: make(map[string]*entity.DocumentClassification)}
}

func (m *mockClassRepo) Create(ctx context.Context, c *entity.DocumentClassification) error {
	m.classifications[c.ID] = c
	return nil
}

func (m *mockClassRepo) ListByDocument(ctx context.Context, docID string) ([]*entity.DocumentClassification, error) {
	var result []*entity.DocumentClassification
	for _, c := range m.classifications {
		if c.DocumentID == docID {
			result = append(result, c)
		}
	}
	return result, nil
}

type mockDownloadRepo struct {
	records map[string]*entity.DownloadRecord
}

func newMockDownloadRepo() *mockDownloadRepo {
	return &mockDownloadRepo{records: make(map[string]*entity.DownloadRecord)}
}

func (m *mockDownloadRepo) Create(ctx context.Context, r *entity.DownloadRecord) error {
	m.records[r.ID] = r
	return nil
}

type mockPresigner struct {
	shouldError bool
}

func (m *mockPresigner) GeneratePresignedURL(ctx context.Context, s3Key string, expiry time.Duration) (string, time.Time, error) {
	if m.shouldError {
		return "", time.Time{}, fmt.Errorf("presigner error")
	}
	expiresAt := time.Now().UTC().Add(expiry)
	return fmt.Sprintf("https://s3.example.com/%s?token=abc123", s3Key), expiresAt, nil
}

func newUseCase() (*DocumentUseCase, *mockDocRepo, *mockVersionRepo, *mockClassRepo, *mockDownloadRepo, *mockPresigner) {
	docRepo := newMockDocRepo()
	versionRepo := newMockVersionRepo()
	classRepo := newMockClassRepo()
	downloadRepo := newMockDownloadRepo()
	presigner := &mockPresigner{}
	uc := NewDocumentUseCase(docRepo, versionRepo, classRepo, downloadRepo, presigner)
	return uc, docRepo, versionRepo, classRepo, downloadRepo, presigner
}

// --- CreateDocument tests ---

func TestCreateDocument_Success(t *testing.T) {
	uc, _, versionRepo, _, _, _ := newUseCase()

	doc, err := uc.CreateDocument(context.Background(),
		"sp-1", "user-1", "report.pdf", "application/pdf",
		"documents/sp-1/report.pdf", 1024, "FINANCIAL",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if doc.ID == "" {
		t.Error("expected document ID to be set")
	}
	if doc.ServiceProviderID != "sp-1" {
		t.Errorf("expected sp-1, got %s", doc.ServiceProviderID)
	}
	if doc.FileName != "report.pdf" {
		t.Errorf("expected report.pdf, got %s", doc.FileName)
	}
	if doc.Status != entity.DocumentStatusActive {
		t.Errorf("expected ACTIVE status, got %s", doc.Status)
	}
	if doc.CurrentVersion != 1 {
		t.Errorf("expected version 1, got %d", doc.CurrentVersion)
	}
	if doc.Classification != "FINANCIAL" {
		t.Errorf("expected FINANCIAL classification, got %s", doc.Classification)
	}

	// Verify initial version was created
	if len(versionRepo.versions) != 1 {
		t.Errorf("expected 1 version, got %d", len(versionRepo.versions))
	}
}

func TestCreateDocument_EmptyFileName(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()
	_, err := uc.CreateDocument(context.Background(), "sp-1", "user-1", "", "application/pdf", "key", 1024, "")
	if err == nil {
		t.Fatal("expected error for empty file name")
	}
}

func TestCreateDocument_EmptyS3Key(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()
	_, err := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "", 1024, "")
	if err == nil {
		t.Fatal("expected error for empty s3 key")
	}
}

// --- GetDocument tests ---

func TestGetDocument_Success(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	result, err := uc.GetDocument(context.Background(), doc.ID, "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ID != doc.ID {
		t.Errorf("expected %s, got %s", doc.ID, result.ID)
	}
}

func TestGetDocument_WrongSP(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, err := uc.GetDocument(context.Background(), doc.ID, "sp-other")
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
}

func TestGetDocument_NotFound(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()
	_, err := uc.GetDocument(context.Background(), "nonexistent", "sp-1")
	if err == nil {
		t.Fatal("expected error for nonexistent document")
	}
}

// --- UpdateDocument tests ---

func TestUpdateDocument_Success(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	updated, err := uc.UpdateDocument(context.Background(), doc.ID, "sp-1", "renamed.pdf", "LEGAL", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.FileName != "renamed.pdf" {
		t.Errorf("expected renamed.pdf, got %s", updated.FileName)
	}
	if updated.Classification != "LEGAL" {
		t.Errorf("expected LEGAL, got %s", updated.Classification)
	}
}

func TestUpdateDocument_WrongSP(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, err := uc.UpdateDocument(context.Background(), doc.ID, "sp-other", "renamed.pdf", "", "")
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
}

// --- DeleteDocument tests ---

func TestDeleteDocument_Success(t *testing.T) {
	uc, docRepo, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	err := uc.DeleteDocument(context.Background(), doc.ID, "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Verify soft delete
	if docRepo.docs[doc.ID].Status != entity.DocumentStatusDeleted {
		t.Errorf("expected DELETED status, got %s", docRepo.docs[doc.ID].Status)
	}
}

func TestDeleteDocument_WrongSP(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	err := uc.DeleteDocument(context.Background(), doc.ID, "sp-other")
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
}

// --- GeneratePresignedURL tests ---

func TestGeneratePresignedURL_Success(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "docs/file.pdf", 1024, "")

	url, expiresAt, err := uc.GeneratePresignedURL(context.Background(), doc.ID, "sp-1", 15)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if url == "" {
		t.Error("expected non-empty URL")
	}
	if expiresAt.IsZero() {
		t.Error("expected non-zero expiry time")
	}
	if !containsString(url, "docs/file.pdf") {
		t.Errorf("expected URL to contain s3 key, got %s", url)
	}
}

func TestGeneratePresignedURL_InvalidExpiry_TooLow(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, _, err := uc.GeneratePresignedURL(context.Background(), doc.ID, "sp-1", 0)
	if err == nil {
		t.Fatal("expected error for expiry < 1")
	}
}

func TestGeneratePresignedURL_InvalidExpiry_TooHigh(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, _, err := uc.GeneratePresignedURL(context.Background(), doc.ID, "sp-1", 61)
	if err == nil {
		t.Fatal("expected error for expiry > 60")
	}
}

func TestGeneratePresignedURL_WrongSP(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, _, err := uc.GeneratePresignedURL(context.Background(), doc.ID, "sp-other", 15)
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
}

func TestGeneratePresignedURL_ArchivedDocument(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")
	uc.UpdateDocument(context.Background(), doc.ID, "sp-1", "", "", "ARCHIVED")

	_, _, err := uc.GeneratePresignedURL(context.Background(), doc.ID, "sp-1", 15)
	if err == nil {
		t.Fatal("expected error for non-active document")
	}
}

func TestGeneratePresignedURL_PresignerError(t *testing.T) {
	uc, _, _, _, _, presigner := newUseCase()
	presigner.shouldError = true

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, _, err := uc.GeneratePresignedURL(context.Background(), doc.ID, "sp-1", 15)
	if err == nil {
		t.Fatal("expected error from presigner")
	}
}

// --- ClassifyDocument tests ---

func TestClassifyDocument_Success(t *testing.T) {
	uc, _, _, classRepo, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	classification, err := uc.ClassifyDocument(context.Background(), doc.ID, "sp-1", "FINANCIAL", 0.95, "AI")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if classification.Label != "FINANCIAL" {
		t.Errorf("expected FINANCIAL, got %s", classification.Label)
	}
	if classification.ConfidenceScore != 0.95 {
		t.Errorf("expected 0.95, got %f", classification.ConfidenceScore)
	}
	if classification.ClassifiedBy != entity.ClassifiedByAI {
		t.Errorf("expected AI, got %s", classification.ClassifiedBy)
	}
	if len(classRepo.classifications) != 1 {
		t.Errorf("expected 1 classification, got %d", len(classRepo.classifications))
	}
}

func TestClassifyDocument_EmptyLabel(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, err := uc.ClassifyDocument(context.Background(), doc.ID, "sp-1", "", 0.9, "USER")
	if err == nil {
		t.Fatal("expected error for empty label")
	}
}

func TestClassifyDocument_InvalidConfidence_TooHigh(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, err := uc.ClassifyDocument(context.Background(), doc.ID, "sp-1", "LEGAL", 1.5, "USER")
	if err == nil {
		t.Fatal("expected error for confidence > 1")
	}
}

func TestClassifyDocument_InvalidConfidence_Negative(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, err := uc.ClassifyDocument(context.Background(), doc.ID, "sp-1", "LEGAL", -0.1, "USER")
	if err == nil {
		t.Fatal("expected error for negative confidence")
	}
}

func TestClassifyDocument_WrongSP(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, err := uc.ClassifyDocument(context.Background(), doc.ID, "sp-other", "LEGAL", 0.9, "USER")
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
}

func TestGetDocumentClassifications_Success(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")
	uc.ClassifyDocument(context.Background(), doc.ID, "sp-1", "FINANCIAL", 0.95, "AI")
	uc.ClassifyDocument(context.Background(), doc.ID, "sp-1", "LEGAL", 0.80, "USER")

	classifications, err := uc.GetDocumentClassifications(context.Background(), doc.ID, "sp-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(classifications) != 2 {
		t.Errorf("expected 2 classifications, got %d", len(classifications))
	}
}

// --- CreateDocumentVersion tests ---

func TestCreateDocumentVersion_Success(t *testing.T) {
	uc, docRepo, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key-v1", 1024, "")

	version, err := uc.CreateDocumentVersion(context.Background(),
		doc.ID, "sp-1", "key-v2", 2048, "user-1", "Updated formatting",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if version.VersionNumber != 2 {
		t.Errorf("expected version 2, got %d", version.VersionNumber)
	}
	if version.S3Key != "key-v2" {
		t.Errorf("expected key-v2, got %s", version.S3Key)
	}
	if version.ChangeSummary != "Updated formatting" {
		t.Errorf("expected change summary, got %s", version.ChangeSummary)
	}

	// Verify document was updated
	updatedDoc := docRepo.docs[doc.ID]
	if updatedDoc.CurrentVersion != 2 {
		t.Errorf("expected document version 2, got %d", updatedDoc.CurrentVersion)
	}
	if updatedDoc.S3Key != "key-v2" {
		t.Errorf("expected document s3_key to be updated, got %s", updatedDoc.S3Key)
	}
}

func TestCreateDocumentVersion_EmptyS3Key(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, err := uc.CreateDocumentVersion(context.Background(), doc.ID, "sp-1", "", 2048, "user-1", "")
	if err == nil {
		t.Fatal("expected error for empty s3 key")
	}
}

func TestCreateDocumentVersion_WrongSP(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, err := uc.CreateDocumentVersion(context.Background(), doc.ID, "sp-other", "key-v2", 2048, "user-1", "")
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
}

func TestCreateDocumentVersion_MultipleVersions(t *testing.T) {
	uc, docRepo, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key-v1", 1024, "")
	uc.CreateDocumentVersion(context.Background(), doc.ID, "sp-1", "key-v2", 2048, "user-1", "v2")
	v3, err := uc.CreateDocumentVersion(context.Background(), doc.ID, "sp-1", "key-v3", 3072, "user-1", "v3")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v3.VersionNumber != 3 {
		t.Errorf("expected version 3, got %d", v3.VersionNumber)
	}
	if docRepo.docs[doc.ID].CurrentVersion != 3 {
		t.Errorf("expected document at version 3, got %d", docRepo.docs[doc.ID].CurrentVersion)
	}
}

// --- ListDocumentVersions tests ---

func TestListDocumentVersions_Success(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key-v1", 1024, "")
	uc.CreateDocumentVersion(context.Background(), doc.ID, "sp-1", "key-v2", 2048, "user-1", "v2")

	versions, total, err := uc.ListDocumentVersions(context.Background(), doc.ID, "sp-1", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 2 {
		t.Errorf("expected 2 versions (initial + new), got %d", total)
	}
	if len(versions) != 2 {
		t.Errorf("expected 2 versions, got %d", len(versions))
	}
}

// --- GetDocumentVersion tests ---

func TestGetDocumentVersion_Success(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key-v1", 1024, "")

	version, err := uc.GetDocumentVersion(context.Background(), doc.ID, "sp-1", 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if version.VersionNumber != 1 {
		t.Errorf("expected version 1, got %d", version.VersionNumber)
	}
}

func TestGetDocumentVersion_NotFound(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key-v1", 1024, "")

	_, err := uc.GetDocumentVersion(context.Background(), doc.ID, "sp-1", 99)
	if err == nil {
		t.Fatal("expected error for nonexistent version")
	}
}

// --- TrackDownload tests ---

func TestTrackDownload_Success(t *testing.T) {
	uc, _, _, _, downloadRepo, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	record, err := uc.TrackDownload(context.Background(), doc.ID, "sp-1", "user-2", 1, "192.168.1.1", "Mozilla/5.0")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record.DocumentID != doc.ID {
		t.Errorf("expected document ID %s, got %s", doc.ID, record.DocumentID)
	}
	if record.DownloadedByUser != "user-2" {
		t.Errorf("expected user-2, got %s", record.DownloadedByUser)
	}
	if record.VersionNumber != 1 {
		t.Errorf("expected version 1, got %d", record.VersionNumber)
	}
	if len(downloadRepo.records) != 1 {
		t.Errorf("expected 1 download record, got %d", len(downloadRepo.records))
	}
}

func TestTrackDownload_WrongSP(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	doc, _ := uc.CreateDocument(context.Background(), "sp-1", "user-1", "file.pdf", "application/pdf", "key", 1024, "")

	_, err := uc.TrackDownload(context.Background(), doc.ID, "sp-other", "user-2", 1, "192.168.1.1", "Mozilla/5.0")
	if err == nil {
		t.Fatal("expected forbidden error for wrong SP")
	}
}

// --- ListDocuments tests ---

func TestListDocuments_Success(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	uc.CreateDocument(context.Background(), "sp-1", "user-1", "file1.pdf", "application/pdf", "key1", 1024, "FINANCIAL")
	uc.CreateDocument(context.Background(), "sp-1", "user-1", "file2.pdf", "application/pdf", "key2", 2048, "LEGAL")
	uc.CreateDocument(context.Background(), "sp-2", "user-2", "file3.pdf", "application/pdf", "key3", 3072, "")

	docs, total, err := uc.ListDocuments(context.Background(), "sp-1", "", "", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 2 {
		t.Errorf("expected 2 docs for sp-1, got %d", total)
	}
	if len(docs) != 2 {
		t.Errorf("expected 2 docs, got %d", len(docs))
	}
}

func TestListDocuments_FilterByClassification(t *testing.T) {
	uc, _, _, _, _, _ := newUseCase()

	uc.CreateDocument(context.Background(), "sp-1", "user-1", "file1.pdf", "application/pdf", "key1", 1024, "FINANCIAL")
	uc.CreateDocument(context.Background(), "sp-1", "user-1", "file2.pdf", "application/pdf", "key2", 2048, "LEGAL")

	docs, total, err := uc.ListDocuments(context.Background(), "sp-1", "", "FINANCIAL", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 1 {
		t.Errorf("expected 1 doc, got %d", total)
	}
	if len(docs) != 1 {
		t.Errorf("expected 1 doc, got %d", len(docs))
	}
}

// --- Helper ---

func containsString(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsSubstr(s, substr))
}

func containsSubstr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
