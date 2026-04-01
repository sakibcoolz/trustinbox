# Task 8.12 — GraphQL Document Queries

> **Section**: 8. Documents — Connected Backend  
> **Priority**: P0 — Data layer  
> **Estimated Scope**: Medium  
> **Route**: N/A (hooks)  
> **File**: `apps/provider/src/lib/graphql/documents.ts`
> **Status**: ✅ Complete

---

## Objective

Create GraphQL query definitions, TypeScript types, and Apollo hooks for document listing, versioning, shared documents, and document detail.

---

## Current State

No `documents.ts` GraphQL module exists. The documents page uses hardcoded mock data. `conversations.ts` has a `SharedDocument` interface for conversation-level doc sharing. The document-service has full CRUD via gRPC.

---

## Requirements

### Types

```typescript
export enum DocumentStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

export interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  status: DocumentStatus;
  serviceProvider: {
    id: string;
    name: string;
  };
  classifications: DocumentClassification[];
  versions: DocumentVersion[];
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentClassification {
  id: string;
  label: string;
  confidence: number;
  classifiedBy: 'AI' | 'USER' | 'SYSTEM';
}

export interface DocumentVersion {
  id: string;
  versionNumber: number;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

export interface DocumentConnection {
  nodes: Document[];
  totalCount: number;
}

export interface DocumentsData {
  documents: DocumentConnection;
}

export interface DocumentData {
  document: Document;
}
```

### Queries

```graphql
query Documents($search: String, $classification: String, $status: DocumentStatus, $limit: Int, $offset: Int) {
  documents(search: $search, classification: $classification, status: $status, limit: $limit, offset: $offset) {
    nodes {
      id
      fileName
      fileType
      fileSize
      status
      classifications { id label confidence classifiedBy }
      shareCount
      createdAt
      updatedAt
    }
    totalCount
  }
}

query Document($id: ID!) {
  document(id: $id) {
    id
    fileName
    fileType
    fileSize
    s3Key
    status
    classifications { id label confidence classifiedBy }
    versions { id versionNumber fileSize uploadedBy createdAt }
    shareCount
    createdAt
    updatedAt
  }
}

query DocumentVersions($documentId: ID!) {
  documentVersions(documentId: $documentId) {
    id
    versionNumber
    fileSize
    uploadedBy
    createdAt
  }
}
```

### Hooks

```typescript
export function useDocuments(variables: DocumentsVariables) {
  return useQuery<DocumentsData>(DOCUMENTS_QUERY, {
    variables,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
}

export function useDocument(id: string) {
  return useQuery<DocumentData>(DOCUMENT_QUERY, {
    variables: { id },
    skip: !id,
  });
}

export function useDocumentVersions(documentId: string) {
  return useQuery(DOCUMENT_VERSIONS_QUERY, {
    variables: { documentId },
    skip: !documentId,
  });
}
```

### Mutations

```typescript
export function useDeleteDocument() {
  return useMutation(DELETE_DOCUMENT, {
    update(cache, { data }) {
      // Remove from documents list
      cache.modify({
        fields: {
          documents(existing, { readField }) {
            return {
              ...existing,
              nodes: existing.nodes.filter((ref: any) => readField('id', ref) !== data.deleteDocument.id),
              totalCount: existing.totalCount - 1,
            };
          },
        },
      });
    },
  });
}
```

### Apollo Cache Config

```typescript
Document: { keyFields: ['id'] },
documents: {
  keyArgs: ['search', 'classification', 'status'],
  merge(existing, incoming) { return incoming; },
},
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/documents.ts` | Create — queries, types, mutations, hooks |
| `apps/provider/src/lib/apollo-provider.tsx` | Modify — add Document cache config |

---

## Acceptance Criteria

- [ ] `DOCUMENTS_QUERY` with search, classification, status, pagination variables
- [ ] `DOCUMENT_QUERY` with id variable (includes versions, classifications)
- [ ] `DOCUMENT_VERSIONS_QUERY` for version history
- [ ] `DELETE_DOCUMENT` mutation with cache update
- [ ] TypeScript interfaces match backend entities
- [ ] `useDocuments`, `useDocument`, `useDocumentVersions` hooks exported
- [ ] `DocumentStatus` enum exported
- [ ] Apollo cache config for Document type

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client auth link)
- **Blocks**: Task 8.1 (document list), Task 8.3 (document card), Task 8.5 (search), Task 8.8 (versions)
- **Related**: Task 7.10 (callbacks query — same pattern), Task 6.12 (conversations query)
