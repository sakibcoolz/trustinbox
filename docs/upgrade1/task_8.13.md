# Task 8.13 — Signed URL Generation for Document Sharing

> **Section**: 8. Documents — Connected Backend  
> **Priority**: P0 — Security  
> **Estimated Scope**: Medium  
> **Route**: N/A (integration)  
> **File**: `apps/provider/src/lib/graphql/documents.ts`
> **Status**: ✅ Complete

---

## Objective

Implement signed URL generation for secure document sharing with customers, ensuring URLs are time-limited, access-tracked, and revocable.

---

## Current State

Backend has `Presigner` interface:
```go
type Presigner interface {
    GeneratePresignedURL(ctx context.Context, s3Key string, expiry time.Duration) (string, time.Time, error)
}
```

Proto defines:
```protobuf
rpc GeneratePresignedURL(GeneratePresignedURLRequest) returns (PresignedURLResponse);
rpc TrackDownload(TrackDownloadRequest) returns (TrackDownloadResponse);
```

No frontend integration exists for generating share URLs or tracking access.

---

## Requirements

### Signed URL Types

| Purpose | Expiry | Context |
|---------|--------|---------|
| **Upload** | 15 minutes | Used during file upload flow |
| **Preview** | 15 minutes | Used in DocumentPreview modal |
| **Download** | 1 hour | Direct download from UI |
| **Share** | Configurable (24h/7d/30d/never) | Shared with customer |

### GraphQL Operations

```graphql
mutation GenerateDocumentShareURL($documentId: ID!, $expiry: String) {
  generateDocumentShareURL(documentId: $documentId, expiry: $expiry) {
    url
    expiresAt
  }
}

mutation TrackDocumentAccess($documentId: ID!, $accessType: String!) {
  trackDocumentAccess(documentId: $documentId, accessType: $accessType)
}
```

### Hook

```typescript
export function useDocumentSignedUrl() {
  return useMutation(GENERATE_DOCUMENT_SHARE_URL);
}

// Usage in preview:
const [getUrl] = useDocumentSignedUrl();
const { data } = await getUrl({
  variables: { documentId, expiry: '15m' },
});
const previewUrl = data.generateDocumentShareURL.url;
```

### Security Rules
- URLs are signed with HMAC (server-side)
- Each URL is single-purpose (upload vs download vs share)
- Access tracking records who, when, what
- Never expose raw S3 keys to frontend
- CORS configured on S3/MinIO for direct browser uploads
- Rate limit URL generation (max 100/minute per SP)

### Access Tracking
- Track preview opens
- Track downloads
- Track share link opens
- Display in document audit trail
- Feed into analytics

### Frontend Helpers

```typescript
// lib/documents.ts

export async function getDocumentPreviewUrl(documentId: string): Promise<string> {
  const { data } = await apolloClient.mutate({
    mutation: GENERATE_DOCUMENT_SHARE_URL,
    variables: { documentId, expiry: '15m' },
  });
  return data.generateDocumentShareURL.url;
}

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  const { data } = await apolloClient.mutate({
    mutation: GENERATE_DOCUMENT_SHARE_URL,
    variables: { documentId, expiry: '1h' },
  });
  // Track the download
  await apolloClient.mutate({
    mutation: TRACK_DOCUMENT_ACCESS,
    variables: { documentId, accessType: 'DOWNLOAD' },
  });
  return data.generateDocumentShareURL.url;
}

export function downloadDocument(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/documents.ts` | Modify — add signed URL mutations |
| `apps/provider/src/lib/documents.ts` | Create — helper functions for URL generation + download |

---

## Acceptance Criteria

- [ ] Preview URL generation (15 min expiry)
- [ ] Download URL generation (1 hour expiry)
- [ ] Share URL generation (configurable expiry)
- [ ] Access tracking on preview/download
- [ ] Never expose raw S3 keys
- [ ] Rate limiting respected
- [ ] Download helper triggers browser download
- [ ] URL expiry enforced server-side

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client)
- **Blocks**: Task 8.2 (upload presigned URL), Task 8.6 (preview URL), Task 8.7 (share URL), Task 8.10 (bulk download URLs)
- **Related**: Task 6.7 (file attachment signed URLs in conversations)
