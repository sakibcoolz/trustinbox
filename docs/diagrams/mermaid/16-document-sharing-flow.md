# 16 — Document Sharing Flow

> Secure document upload via MinIO, sharing with presigned URLs, access control, and metadata tracking.

## Document Architecture

```mermaid
graph TB
    subgraph "Provider Portal"
        Upload["Document Upload UI<br/>/documents"]
        Share["Share Dialog<br/>Select users/conversations"]
    end

    subgraph "Gateway (:4000)"
        DocAPI["REST API<br/>/api/v1/documents/*"]
    end

    subgraph "document-service (:50062)"
        DocUC["DocumentUseCase<br/>Upload, share, list, revoke"]
        DocRepo["DocumentRepository<br/>documents table<br/>document_shares table"]
    end

    subgraph "MinIO (:9000)"
        Bucket["trustinbox-documents bucket<br/>Organized by: sp_id/year/month/filename"]
        Presign["Presigned URL Generator<br/>Time-limited access (1 hour)"]
    end

    subgraph "PostgreSQL"
        DocTable["documents<br/>id · sp_id · uploader_id<br/>filename · content_type · size<br/>storage_path · created_at"]
        ShareTable["document_shares<br/>document_id · shared_with_user_id<br/>shared_by · expires_at"]
    end

    Upload --> DocAPI --> DocUC
    DocUC --> DocRepo --> DocTable & ShareTable
    DocUC --> Bucket & Presign
```

## Document Upload Flow

```mermaid
sequenceDiagram
    participant SP as Provider Portal
    participant GW as Gateway
    participant DS as document-service
    participant MinIO as MinIO (:9000)
    participant DB as PostgreSQL
    participant Redis as Redis Events

    SP->>GW: POST /api/v1/documents/upload<br/>Content-Type: multipart/form-data<br/>{file, description, tags[]}

    GW->>DS: gRPC UploadDocument(file, metadata)

    DS->>DS: Validate file:<br/>• Size limit (50MB)<br/>• Allowed types (pdf, doc, xlsx, jpg, png, ...)<br/>• Scan filename for path traversal

    DS->>DS: Generate storage path:<br/>sp_id/2024/02/uuid-filename.ext

    DS->>MinIO: PutObject(bucket, path, fileData)<br/>Content-Type: application/pdf
    MinIO-->>DS: OK (ETag, size)

    DS->>DB: INSERT INTO documents<br/>(id, sp_id, uploaded_by, filename,<br/>content_type, size_bytes, storage_path,<br/>description, tags, created_at)

    DS->>Redis: XADD {type: document.uploaded}

    DS-->>GW: {document: {id, filename, size, url, ...}}
    GW-->>SP: 201 Created
```

## Document Sharing Flow

```mermaid
sequenceDiagram
    participant SP as Provider Portal
    participant GW as Gateway
    participant DS as document-service
    participant MinIO as MinIO
    participant DB as PostgreSQL
    participant NS as notification-service
    participant User as End User

    SP->>GW: POST /api/v1/documents/:id/share<br/>{userIds[], expiresIn: "7d", message}

    GW->>DS: gRPC ShareDocument(docID, userIDs, expiry)

    DS->>DB: SELECT * FROM documents WHERE id = $1
    DS->>DS: Verify SP owns document

    loop For each target user
        DS->>DB: INSERT INTO document_shares<br/>(document_id, shared_with_user_id,<br/>shared_by, expires_at, message)
    end

    DS->>Redis: XADD {type: document.shared}

    Note over NS: Worker creates notification
    Redis-->>NS: document.shared event
    NS->>User: "Organization X shared a document with you"

    DS-->>GW: {shares: [{userId, expiresAt}, ...]}
    GW-->>SP: 200 OK
```

## Document Download (Presigned URL)

```mermaid
sequenceDiagram
    participant User as End User (Web App)
    participant GW as Gateway
    participant DS as document-service
    participant DB as PostgreSQL
    participant MinIO as MinIO

    User->>GW: GET /api/v1/documents/:id/download

    GW->>DS: gRPC GetDocumentURL(docID, userID)

    DS->>DB: SELECT d.*, ds.expires_at<br/>FROM documents d<br/>JOIN document_shares ds ON d.id = ds.document_id<br/>WHERE d.id = $1 AND ds.shared_with_user_id = $2

    alt Share not found or expired
        DS-->>GW: Forbidden "no access or share expired"
        GW-->>User: 403
    end

    DS->>MinIO: PresignedGetObject(bucket, storage_path, 1 hour)
    MinIO-->>DS: https://minio:9000/trustinbox-documents/...?X-Amz-Signature=...

    DS-->>GW: {url: presigned_url, expiresIn: 3600}
    GW-->>User: 200 {downloadUrl}

    User->>MinIO: GET presigned URL (direct download)
    MinIO-->>User: File binary data

    Note over User,MinIO: Direct download from MinIO<br/>No proxy through gateway<br/>URL expires in 1 hour
```

## Document Access Control

```mermaid
flowchart TB
    Request(["GET /documents/:id/download"])

    Auth{"User authenticated?"}
    Owner{"User is SP member<br/>who uploaded?"}
    Shared{"Document shared<br/>with user?"}
    Expired{"Share expired?"}

    Grant["✅ Generate presigned URL"]
    Deny1["❌ 401 Unauthorized"]
    Deny2["❌ 403 No access"]
    Deny3["❌ 403 Share expired"]

    Request --> Auth
    Auth -->|No| Deny1
    Auth -->|Yes| Owner
    Owner -->|Yes| Grant
    Owner -->|No| Shared
    Shared -->|No| Deny2
    Shared -->|Yes| Expired
    Expired -->|Yes| Deny3
    Expired -->|No| Grant

    style Grant fill:#22c55e20,stroke:#22c55e
    style Deny1 fill:#ef444420,stroke:#ef4444
    style Deny2 fill:#ef444420,stroke:#ef4444
    style Deny3 fill:#ef444420,stroke:#ef4444
```

## Document Storage Layout (MinIO)

```mermaid
graph TB
    subgraph "MinIO Bucket: trustinbox-documents"
        subgraph "SP abc-123"
            S1["abc-123/2024/01/doc-001-report.pdf"]
            S2["abc-123/2024/01/doc-002-invoice.xlsx"]
            S3["abc-123/2024/02/doc-003-contract.pdf"]
        end
        subgraph "SP def-456"
            S4["def-456/2024/02/doc-004-policy.pdf"]
            S5["def-456/2024/02/doc-005-image.png"]
        end
    end

    subgraph "Access Model"
        Never["❌ Never: Direct S3/MinIO path access"]
        Always["✅ Always: Presigned URLs only<br/>1-hour expiry<br/>Signed with MinIO credentials"]
    end
```
