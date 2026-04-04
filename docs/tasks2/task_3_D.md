# Task 3D — Documents (Tasks 3.15–3.18)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3D — Documents
> **Files**: `apps/web/src/app/(dashboard)/documents/page.tsx`, `apps/web/src/lib/graphql/documents.ts` (new), `apps/web/src/hooks/useDocuments.ts` (new)
> **GraphQL**: No `myDocuments` query exists yet — requires gateway extension or REST fallback

---

## Objective

Replace the 100% mock documents page with real data, add presigned-URL downloads via the document-service, inline preview for images/PDFs, and filtering by SP, file type, and classification.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/documents/page.tsx — 329 lines, 100% MOCK
'use client';

import { useState, useMemo, useCallback } from 'react';

interface DocumentShare {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  serviceProvider: { name: string; industry: string };
  sharedAt: string;
  classification: string;
  description: string;
  downloadCount: number;
  opened: boolean;
}

const mockDocs: DocumentShare[] = [
  {
    id: '1', fileName: 'Insurance_Policy_2026.pdf', fileType: 'application/pdf',
    fileSize: '2.4 MB', serviceProvider: { name: 'Acme Insurance', industry: 'Insurance' },
    sharedAt: '2026-03-28T10:00:00Z', classification: 'Policy Document',
    description: 'Your updated auto insurance policy...', downloadCount: 3, opened: true,
  },
  // ... 4 more mock documents
];

// fileIcon helper — maps MIME type to emoji
const fileIcon = (type: string) => {
  if (type.includes('pdf')) return '📄';
  if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('image')) return '🖼️';
  return '📎';
};

// handleDownload — state-only with TODO comment
const handleDownload = useCallback((id: string) => {
  // In production: fetch presigned URL from /api/files/{documentId}
  const doc = docs.find((d) => d.id === id);
  if (doc) alert(`Downloading ${doc.fileName}...`);
}, [docs]);

// handleSelect — marks document as opened (state-only)
const handleSelect = useCallback((id: string) => {
  setSelectedId(id);
  setDocs((prev) => prev.map((d) => d.id === id ? { ...d, opened: true } : d));
}, []);
```

**UI Elements Already Built** (keep these, rewire data):
- Search filter (filename matching)
- Document list with file icons, name, SP name, date, size, classification
- Detail viewer panel (right side) with file info and download button
- File type icon mapping
- "Opened" status indicator

**Gaps**:
- All data from `mockDocs` — no backend query
- No `myDocuments` query in GraphQL schema (only `DocumentShare` type exists)
- `handleDownload` is a placeholder `alert()` — no presigned URL fetch
- No inline preview for images/PDFs
- No filter by SP, file type, or classification
- No pagination, loading, or error states

### GraphQL Schema Available

```graphql
# Type exists but NO query to fetch documents for a user:
type DocumentShare {
  id: ID!; documentId: ID!; fileName: String!; fileType: String!
  shareContext: String!; serviceProvider: ServiceProvider!
  createdAt: DateTime!; openedAt: DateTime
}

# NOTE: No myDocuments or documents query — will need to be added to gateway
# or use REST fallback to document-service
```

### REST Fallback (document-service)

The document-service exposes gRPC RPCs that the gateway can proxy:
- `ListDocumentShares` — returns user's shared documents
- `GetPresignedURL` — returns download/preview URL for a document

Until the GraphQL schema adds a documents query, use REST API routes.

---

## Task 3.15 — Wire Documents Page to Backend Query

### Requirements

- [x] **Option A — GraphQL** (preferred, requires gateway change):
  - [x] Add `myDocuments(limit: Int, offset: Int): [DocumentShare!]!` query to schema
  - [x] Create `apps/web/src/lib/graphql/documents.ts` with operations
  - [x] Create `apps/web/src/hooks/useDocuments.ts` using `useQuery`
- [x] **Option B — REST fallback** (if schema not extended yet):
  - [x] Create `apps/web/src/hooks/useDocuments.ts` using `fetch` to REST endpoint
  - [x] API route: `GET /api/documents` → gateway proxy → document-service
  - [x] Return `{ documents, loading, error, refetch }`
- [x] Update `documents/page.tsx`:
  - [x] Remove `mockDocs` array
  - [x] Use `useDocuments()` hook for data
  - [x] Add loading skeleton matching existing card layout
  - [x] Add error state with retry
  - [x] Add pagination controls
  - [x] Map backend `DocumentShare` type to existing UI interface:
    - [x] `shareContext` → `classification`
    - [x] `createdAt` → `sharedAt`
    - [x] `openedAt` → `opened` (boolean: null = not opened)
    - [x] `fileSize` not in schema — hide or show "—" until added

### Implementation Details

```typescript
// apps/web/src/lib/graphql/documents.ts (Option A — if schema extended)
import { gql } from '@apollo/client';

export const GET_MY_DOCUMENTS = gql`
  query GetMyDocuments($limit: Int, $offset: Int) {
    myDocuments(limit: $limit, offset: $offset) {
      id documentId fileName fileType shareContext
      serviceProvider { id name industry }
      createdAt openedAt
    }
  }
`;
```

```typescript
// apps/web/src/hooks/useDocuments.ts (Option B — REST fallback)
import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useDocuments(page: number = 1) {
  const [documents, setDocuments] = useState<DocumentShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/api/documents?limit=20&offset=${(page - 1) * 20}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  return { documents, loading, error, refetch: fetchDocs };
}
```

---

## Task 3.16 — Add Document Download via Presigned URLs

### Requirements

- [x] Replace placeholder `alert()` download with real presigned URL flow:
  - [x] Call document-service `GetPresignedURL` via gateway API
  - [x] Endpoint: `GET /api/documents/{documentId}/download` → returns `{ url: string, expiresAt: string }`
  - [x] Open presigned URL in new tab or trigger browser download
- [x] Add download progress indicator:
  - [x] Show spinner on download button while fetching URL
  - [x] Replace with checkmark on success
- [x] Handle expired URLs:
  - [x] If URL expired, re-fetch before download
  - [x] Show error toast on failure
- [x] Track downloads:
  - [x] Mark document as opened via API call after download
  - [x] Update local state to show "Downloaded" status

### Implementation Details

```typescript
// handleDownload replacement
const handleDownload = useCallback(async (documentId: string) => {
  setDownloading(documentId);
  try {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_BASE}/api/documents/${documentId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to get download URL');
    const { url } = await res.json();
    window.open(url, '_blank');
  } catch (err) {
    // Show error toast
  } finally {
    setDownloading(null);
  }
}, []);
```

---

## Task 3.17 — Add Document Preview

### Requirements

- [x] Add inline preview for supported file types:
  - [x] **PDF**: embed with `<iframe>` or `<object>` pointing to presigned URL
  - [x] **Images** (jpeg, png, gif, webp): display with `<img>` in detail panel
  - [x] **Other**: show file icon + "Preview not available" + download button
- [x] Preview in detail panel:
  - [x] Click document → detail panel shows preview (if supported) or info card
  - [x] "Open Full Screen" button → opens in new tab
- [x] Preview loading state:
  - [x] Show skeleton/spinner while presigned URL is fetched
  - [x] Lazy load the preview iframe/image
- [x] Security:
  - [x] Presigned URLs are temporary (expire) — re-fetch if needed
  - [x] Never store presigned URLs in client state long-term

---

## Task 3.18 — Add Document Filtering and Search

### Requirements

- [x] Add filter bar above document list:
  - [x] **By Service Provider**: dropdown of SPs that have shared docs
  - [x] **By File Type**: chips for PDF, Spreadsheet, Document, Image, Other
  - [x] **By Classification**: chips based on `shareContext` values
  - [x] **Sort**: Date (newest/oldest), Name (A-Z/Z-A)
- [x] Search by filename:
  - [x] Debounced input (300ms)
  - [x] Client-side filter on loaded documents
  - [x] If server supports search, pass as query param
- [x] Filter combination:
  - [x] Multiple filters are AND-combined
  - [x] Show active filter count badge
  - [x] "Clear Filters" button
- [x] Empty state when no documents match filters

---

## Verification Checklist

- [x] Documents page loads real data (GraphQL or REST)
- [x] Document list shows file icon, name, SP name, date, classification
- [x] Download triggers presigned URL fetch and opens file
- [x] Download button shows spinner during URL fetch
- [x] Preview works for PDF files (embedded iframe)
- [x] Preview works for image files (inline display)
- [x] Filter by SP dropdown works
- [x] Filter by file type chips work
- [x] Search by filename filters the list
- [x] Sort by date/name works
- [x] Loading skeleton displays during initial fetch
- [x] Error state shows with retry button
- [x] Pagination works
- [x] Mobile responsive (detail panel becomes full-screen)

---

## Dependencies

**Depends on**:
- Task 2.1 — Apollo Client configured (if using GraphQL)
- Gateway needs `myDocuments` query added (or use REST fallback)
- document-service `GetPresignedURL` RPC must be accessible via gateway

**Blocks**:
- Task 3C.13 — SP detail page documents tab

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/documents/page.tsx` | Main documents page (329 lines, 100% mock) |
| `apps/web/src/lib/graphql/documents.ts` | **New** — GraphQL operations (if schema extended) |
| `apps/web/src/hooks/useDocuments.ts` | **New** — Data-fetching hook |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema — `DocumentShare` type exists but no query |
| `services/document-service/` | Backend service with `GetPresignedURL` RPC |
