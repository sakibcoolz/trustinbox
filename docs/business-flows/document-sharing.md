# Business Flow: Document Upload & Secure Sharing

## Overview

Service providers can upload and share documents with customers through TrustInbox. All document access is mediated through time-limited presigned URLs — no direct file paths are ever exposed. Every download is tracked for audit compliance.

## Actors

- **Service Provider (SP_ADMIN / AGENT)**: Uploads and shares documents
- **Customer**: Views and downloads shared documents
- **Document Service**: Manages document lifecycle, classification, and access URLs
- **Policy Service**: Validates sharing is allowed
- **MinIO**: S3-compatible object storage backend

## Flow Steps

### Phase 1: Document Upload

1. SP user navigates to **Documents** page or opens customer conversation
2. SP user selects file(s) to upload:
   - Supported formats: PDF, DOCX, XLSX, PNG, JPG, CSV
   - Max file size: 25 MB per file
   - Max files per upload: 10
3. Gateway receives multipart upload and streams to MinIO
4. Document service creates record:
   - File metadata (name, size, MIME type, checksum)
   - Classification (auto-detected or SP-selected): Statement, Agreement, Report, Certificate, Invoice, Other
   - Version: 1 (auto-incremented on re-upload)
   - Status: `UPLOADED`

### Phase 2: Document Classification

5. If AI service is available:
   - Document content is analyzed for auto-classification
   - Industry-specific document types are suggested (e.g., "Loan Agreement" for banking)
6. SP can override auto-classification manually
7. Tags and metadata are attached to the document

### Phase 3: Sharing with Customer

8. SP selects customer(s) to share the document with
9. Policy service validates:
   - SP is verified
   - Customer has not blocked the SP
   - Customer has document sharing consent enabled
   - DND is not active (for notification about the share)
10. If ALLOWED:
    - `document_shares` record created linking document to customer
    - Customer receives notification: "New document shared by [SP Name]"
    - Event published: `document.shared`
11. If DENIED:
    - SP receives denial reason
    - No document share created

### Phase 4: Customer Access

12. Customer sees shared document in:
    - **Document Center** page (all shared documents)
    - **Conversation thread** (if shared within a conversation)
    - **Notification** (link to document)
13. Customer clicks to view/download
14. Document service generates presigned URL:
    - URL is time-limited (15-minute expiry)
    - Scoped to the specific user and document
    - Includes download token for audit tracking
15. Browser opens/downloads via presigned URL
16. Download event recorded: `document.downloaded`

### Phase 5: Version Management

17. SP uploads a new version of an existing document
18. System increments version number
19. Previous versions remain accessible
20. Customers who have the document shared see the latest version
21. Version history is visible in document detail view

### Phase 6: Audit Trail

22. Every action is logged:
    - Upload: who, when, file details
    - Share: who shared, with whom, policy decision
    - Download: who downloaded, when, IP (hashed)
    - Version: upload of new version, who, when
23. Audit trail visible in:
    - SP's **Documents** page → document detail → audit tab
    - SP's **Compliance** page → document audit section
    - Platform admin's audit dashboard

## Document Statuses

| Status | Description |
|--------|-------------|
| `UPLOADED` | File stored in MinIO, not yet shared |
| `SHARED` | Shared with one or more customers |
| `ARCHIVED` | Soft-deleted by SP, no longer accessible |
| `EXPIRED` | Auto-expired based on retention policy |

## Business Rules

- **Presigned URLs only**: Direct MinIO paths are never exposed to any client
- **Time-limited access**: Presigned URLs expire after 15 minutes
- **Policy gating**: Document sharing respects user consent and blocking rules
- **Version immutability**: Previous versions cannot be deleted (audit compliance)
- **SP-scoped storage**: Documents are isolated per service provider
- **Classification required**: Documents must have a classification before sharing
- **Size limits**: 25 MB per file, 10 files per upload batch
- **Checksum verification**: SHA-256 checksum computed on upload, verified on download
- **Retention policies**: Industry-specific retention periods (365 days banking, 730 days healthcare)

## Error Cases

- File too large → reject with `file_too_large`
- Unsupported format → reject with `unsupported_format`
- Customer blocked SP → reject share with `customer_blocked`
- MinIO unavailable → retry upload, return `storage_unavailable`
- Presigned URL expired → customer requests new URL (automatic refresh)
- Document archived → reject access with `document_archived`

## Data Model

```
documents
├── id (UUID)
├── service_provider_id (FK)
├── name (VARCHAR)
├── mime_type (VARCHAR)
├── size_bytes (BIGINT)
├── checksum_sha256 (VARCHAR)
├── classification (VARCHAR)
├── storage_path (VARCHAR)  -- internal MinIO path, never exposed
├── version (INT)
├── parent_document_id (UUID, nullable)  -- for versioning
├── status (VARCHAR)
├── uploaded_by (UUID)
├── metadata (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

document_shares
├── id (UUID)
├── document_id (FK)
├── user_id (FK)
├── shared_by (UUID)
├── status (VARCHAR)
├── created_at (TIMESTAMPTZ)
└── expires_at (TIMESTAMPTZ, nullable)

document_access_logs
├── id (UUID)
├── document_id (FK)
├── user_id (FK)
├── action (VARCHAR: viewed/downloaded)
├── ip_hash (VARCHAR)
├── created_at (TIMESTAMPTZ)
```

## Events Published

| Event | Trigger |
|-------|---------|
| `document.uploaded` | New document uploaded |
| `document.shared` | Document shared with customer |
| `document.downloaded` | Customer downloads document |
| `document.archived` | Document archived by SP |
| `document.version.created` | New version uploaded |
