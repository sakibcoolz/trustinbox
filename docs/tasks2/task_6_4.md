# Task 6.4 — Document Sharing E2E

> **Phase**: 6 — Cross-App End-to-End Flows
> **Goal**: Verify the complete document lifecycle: Provider uploads file to MinIO → Shares with customer → Customer sees document in Web App → Customer downloads via presigned URL → File integrity confirmed.
> **Type**: Integration test scenario validating document upload, storage, sharing, and download across both apps.

---

## Objective

Verify that a document uploaded in the Provider Portal is stored in MinIO, shared with a specific customer, appears in the Web App documents page, and can be previewed/downloaded securely via presigned URLs with file integrity preserved.

---

## Architecture Flow

```
Provider Portal (/documents)
  └─ Upload: POST /api/documents/upload (get presigned URL)
       └─ PUT to MinIO presigned URL (direct upload)
  └─ Register: POST /api/documents (register in service)
       └─ Gateway → gRPC → document-service (:50062)
            ├─ docRepo.Create() → PostgreSQL
            └─ versionRepo.Create() → version v1
  └─ Share: POST /api/documents/{id}/share
       └─ Gateway → document-service
            ├─ shareRepo.Create() → share record
            └─ publisher.Publish(DocumentShared) → Redis

Web App (/documents)
  └─ List: GET /api/documents (myDocuments query)
       └─ Gateway → document-service.ListSharedDocuments()
  └─ Download: GET /api/documents/{id}/download
       └─ Gateway → document-service.GetPresignedURL()
            └─ Returns S3 presigned URL → browser downloads
```

---

## Current State

### Provider Portal — Documents Page (`apps/provider/src/app/documents/page.tsx`, ~200 lines)

- **Status**: FULLY IMPLEMENTED
- Features: UploadZone (drag-drop), view mode toggle (grid/list), classification filter, search, document cards with badges, share modal, delete confirmation, version history
- Permissions: upload/share/delete gated via `usePermission()`
- Classification types: invoice, identity, contract, report, general

### Document Service (`services/document-service/internal/usecase/document.go`, ~200+ lines)

```go
// CreateDocument: validate → create entity (status=ACTIVE) → create DocumentVersion (v1)
func (uc *DocumentUseCase) CreateDocument(ctx, spID, uploadedBy, fileName, fileType, s3Key, fileSize, classification)

// ShareDocument: create share record linking document to recipient
func (uc *DocumentUseCase) ShareDocument(ctx, docID, recipientUserID, shareContext)

// GetPresignedURL: generate time-limited S3 download URL
func (uc *DocumentUseCase) GetPresignedURL(ctx, docID, spID) → presigned URL string

// GetDocument: with SP ownership validation
func (uc *DocumentUseCase) GetDocument(ctx, docID, spID) → *Document
```

- Repos: `docRepo`, `versionRepo`, `classRepo`, `downloadRepo`, `presigner` (S3/MinIO)
- Storage: MinIO (S3-compatible, localhost:9000)

### Gateway — Document Handlers (`gateway/graphql-bff/cmd/server/document_handlers.go`)

- POST `/api/documents/upload` — returns presigned upload URL for MinIO
- GET `/api/documents` — list documents (shared with user or owned by SP)
- GET `/api/documents/{id}` — presigned download URL
- POST `/api/documents/{id}/share` — share with user

### Web App — Documents Page (`apps/web/src/app/(dashboard)/documents/page.tsx`, ~150 lines)

- **Status**: MOCK DATA (5 hardcoded documents)
- Features: list with file type icons, search, opened/download tracking, detail panel
- **Missing**: Real API wiring — no GraphQL queries, no presigned URL downloads

---

## Requirements

### Sub-task 6.4.1 — Provider Portal: Upload Document

- [ ] Open Provider Portal → navigate to `/documents`
- [ ] Click upload area or drag-and-drop a file:
  - Test file: PDF document (e.g., `invoice-2024-001.pdf`, ~500 KB)
- [ ] Verify upload flow:
  1. Frontend requests presigned upload URL: POST `/api/documents/upload`
     - Response: `{ uploadUrl: "https://minio:9000/bucket/key?signature=...", s3Key: "..." }`
  2. Frontend PUTs file directly to MinIO presigned URL
  3. Frontend registers document: POST `/api/documents`
     - Payload: `{ fileName, fileType, s3Key, fileSize, classification }`
- [ ] Verify `document-service.CreateDocument()`:
  - Creates document entity with status `ACTIVE`
  - Creates `DocumentVersion` v1
  - Persists to PostgreSQL
- [ ] Verify document appears in provider's document list:
  - File name, size, classification badge, upload timestamp
  - Version: v1
- [ ] Verify file exists in MinIO:
  - MinIO console at `localhost:9001` (or via `mc` CLI)
  - Bucket and key match the registered s3Key

### Sub-task 6.4.2 — Provider Portal: Set Classification

- [ ] Click on uploaded document → verify classification:
  - Default or selected during upload
  - Options: invoice, identity, contract, report, general
- [ ] Change classification (if editable):
  - Verify backend update
- [ ] Verify classification badge updates on document card

### Sub-task 6.4.3 — Provider Portal: Share with Customer

- [ ] Click "Share" button on the document
- [ ] Share modal/dialog opens:
  - Search for customer by virtual ID
  - Select recipient
  - Optional: share context/message
- [ ] Click "Share" / "Send"
- [ ] Verify `document-service.ShareDocument()` executes:
  - Creates share record in PostgreSQL:
    ```sql
    SELECT id, document_id, recipient_user_id, shared_by, share_context, created_at
    FROM document_shares
    WHERE document_id = '<doc-id>'
    ORDER BY created_at DESC LIMIT 1;
    ```
  - Publishes `document.shared` event
- [ ] Verify success toast: "Document shared with [customer name/VID]"
- [ ] Verify share count increments on document card

### Sub-task 6.4.4 — Web App: See Shared Document

- [ ] Open Web App → navigate to `/documents`
- [ ] Verify shared document appears in list:
  - File name: `invoice-2024-001.pdf`
  - SP name: the sharing organization
  - Classification badge
  - Shared date
  - File size
  - File type icon (PDF)
- [ ] Verify document is ONLY visible to the intended recipient:
  - Log in as a different customer → document should NOT appear
  - Query: `myDocuments` returns only documents shared with the authenticated user

### Sub-task 6.4.5 — Web App: Preview Document

- [ ] Click on the document to open detail/preview
- [ ] For PDF files:
  - Verify inline PDF preview renders (embedded viewer or iframe)
  - Verify presigned URL is fetched for preview
- [ ] For image files (if testing with images):
  - Verify inline image preview
  - Verify image loads via presigned URL
- [ ] For unsupported formats (xlsx, zip, etc.):
  - Verify file type icon displayed as fallback
  - "Download" button shown instead of preview

### Sub-task 6.4.6 — Web App: Download Document

- [ ] Click "Download" button on the document
- [ ] Verify presigned URL flow:
  1. Frontend calls GET `/api/documents/{id}/download` (or similar endpoint)
  2. Gateway calls `document-service.GetPresignedURL(docID, spID)`
  3. Returns time-limited presigned URL from MinIO
  4. Browser redirects to presigned URL → file downloads
- [ ] Verify file integrity:
  - Downloaded file size matches original upload
  - File content is identical (checksum/hash comparison)
  - File name preserved in download
- [ ] Verify presigned URL is time-limited:
  - URL should expire after a short window (e.g., 5–15 minutes)
  - Accessing expired URL returns 403

### Sub-task 6.4.7 — Access Control Validation

- [ ] Verify customer can only access their own shared documents:
  - API returns only documents where `recipient_user_id` matches authenticated user
  - Direct presigned URL request for another user's document → 403 or 404
- [ ] Verify SP can only manage their own documents:
  - Provider Portal shows only documents owned by the active SP
  - Attempting to share/delete another SP's document → 403
- [ ] Verify unshared documents are invisible to customers:
  - Document exists in MinIO but has no share record → customer cannot see it
- [ ] Verify deleted documents are inaccessible:
  - Provider deletes document → customer's list no longer shows it
  - Previous presigned URLs stop working (or document marked as deleted)

---

## Verification Checklist

- [ ] Provider: upload file → presigned URL workflow → file in MinIO → registered in service
- [ ] Provider: document appears in list with correct name, size, classification, version
- [ ] Provider: share document with specific customer → share record created → event published
- [ ] Web App: shared document appears in customer's document list
- [ ] Web App: correct SP name, classification, file type, shared date displayed
- [ ] Web App: preview works for PDF and images (via presigned URLs)
- [ ] Web App: download preserves file integrity (size and content match)
- [ ] Access control: document visible only to intended recipient
- [ ] Access control: other customers cannot see or download the document
- [ ] Presigned URLs: time-limited, expire appropriately
- [ ] Jaeger: traces for upload → share → download flow
- [ ] MinIO: file physically present in correct bucket/key
