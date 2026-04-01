# Task 8.11 — Document Upload Backend Integration (Presigned URLs)

> **Section**: 8. Documents — Connected Backend  
> **Priority**: P0 — Data layer  
> **Estimated Scope**: Medium  
> **Route**: N/A (integration)  
> **File**: `apps/provider/src/lib/graphql/documents.ts`
> **Status**: ✅ Complete

---

## Objective

Create the frontend integration for the presigned URL upload flow: request a presigned URL from document-service, upload directly to MinIO/S3, then register the document record.

---

## Current State

Backend proto defines:
```protobuf
rpc GeneratePresignedURL(GeneratePresignedURLRequest) returns (PresignedURLResponse);
rpc CreateDocument(CreateDocumentRequest) returns (Document);
```

`apps/provider/src/lib/api.ts` has `uploadMedia()` which uploads to `/api/cms/media` — a different flow (CMS media). The document-service uses presigned URLs.

Backend `services/document-service/internal/infra/s3/presigner.go` implements `GeneratePresignedURL(ctx, s3Key, expiry)`.

---

## Requirements

### Upload Flow

```
Frontend                    Gateway                   Document-Service       MinIO
   │                          │                            │                   │
   ├─ generatePresignedURL ──►│─── gRPC ──────────────────►│                   │
   │◄── {url, s3Key, exp} ───│◄────────────────────────────│                   │
   │                          │                            │                   │
   ├─ PUT file to presigned URL ──────────────────────────────────────────────►│
   │◄── 200 OK ──────────────────────────────────────────────────────────────│
   │                          │                            │                   │
   ├─ createDocument(s3Key) ─►│─── gRPC ──────────────────►│                   │
   │◄── Document record ─────│◄────────────────────────────│                   │
```

### GraphQL Operations

```graphql
# May need these added to schema or use REST endpoint
mutation GeneratePresignedURL($fileName: String!, $fileType: String!) {
  generatePresignedURL(fileName: $fileName, fileType: $fileType) {
    url
    s3Key
    expiresAt
  }
}

mutation CreateDocument($input: CreateDocumentInput!) {
  createDocument(input: $input) {
    id
    fileName
    fileType
    fileSize
    status
    createdAt
  }
}
```

### Upload Helper

```typescript
export async function uploadDocument(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Document> {
  // 1. Get presigned URL
  const { url, s3Key } = await generatePresignedUrl(file.name, file.type);

  // 2. Upload to S3 with progress tracking
  await uploadToS3(url, file, onProgress);

  // 3. Register document
  const doc = await createDocumentRecord({
    fileName: file.name,
    s3Key,
    fileSize: file.size,
    fileType: file.type,
  });

  return doc;
}

function uploadToS3(url: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.((e.loaded / e.total) * 100);
    };
    xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
```

### Security
- Presigned URLs expire in 15 minutes
- Content-Type must match requested type
- Max file size enforced server-side
- S3 key generated server-side (not client-chosen)

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/documents.ts` | Create — presigned URL mutation, createDocument mutation |
| `apps/provider/src/lib/upload.ts` | Create — upload helper with progress tracking |

---

## Acceptance Criteria

- [ ] `generatePresignedURL` mutation/query works
- [ ] Direct upload to S3/MinIO via presigned URL
- [ ] Progress tracking via XMLHttpRequest
- [ ] `createDocument` mutation registers file in DB
- [ ] Upload helper function with error handling
- [ ] Presigned URL expiry enforced (15 min)
- [ ] Content-Type validated
- [ ] S3 key server-generated (no client control)

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client)
- **Blocks**: Task 8.2 (upload zone uses this), Task 8.8 (version upload)
- **Related**: Task 6.7 (file attachment upload in conversations)
