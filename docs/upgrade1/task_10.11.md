# Task 10.11 — Knowledge Base Editor

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/bots/[id]/knowledge`  
> **File**: `apps/provider/src/app/bots/[id]/knowledge/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the knowledge base page from hardcoded mock sources to a GraphQL-powered view. Fetch real knowledge sources, display their processing status aligned with `KnowledgeSourceStatus` enum, and show accurate stats.

---

## Current State

```tsx
// apps/provider/src/app/bots/[id]/knowledge/page.tsx — 139 lines
const knowledgeSources = [
  { name: 'Product FAQ', type: 'PDF', status: 'Indexed', chunks: 245, size: '2.4 MB', lastSynced: '2 hours ago' },
  { name: 'Help Center Articles', type: 'Web Crawl', status: 'Indexed', chunks: 1203, size: '15.7 MB', lastSynced: '1 day ago' },
  { name: 'API Documentation', type: 'Markdown', status: 'Indexed', chunks: 89, size: '1.1 MB', lastSynced: '3 days ago' },
  { name: 'Release Notes', type: 'Web Crawl', status: 'Syncing', chunks: 0, size: '0 MB', lastSynced: 'In progress' },
  { name: 'Internal Policies', type: 'PDF', status: 'Error', chunks: 0, size: '3.2 MB', lastSynced: 'Failed' },
];
```

**Issues**:
- All data hardcoded — no GraphQL queries
- Status labels mismatch: "Indexed" → `ACTIVE_SOURCE`, "Syncing" → `PROCESSING`, "Error" → `FAILED`
- `type: 'Web Crawl'` / `'Markdown'` don't match `KnowledgeSourceType` enum (DOCUMENT/URL/TEXT/FAQ/API)
- Stats cards all hardcoded
- No real `chunkCount` from schema
- Add Source form exists but is not connected

### GraphQL Schema

```graphql
enum KnowledgeSourceType { DOCUMENT, URL, TEXT, FAQ, API }
enum KnowledgeSourceStatus { PENDING, PROCESSING, ACTIVE_SOURCE, FAILED }

type KnowledgeSource {
  id: ID!
  botId: ID!
  sourceType: KnowledgeSourceType!
  name: String!
  description: String
  content: String
  s3Key: String
  fileType: String
  fileSize: Int
  chunkCount: Int
  status: KnowledgeSourceStatus!
  createdAt: DateTime!
}

query {
  botKnowledgeSources(botId: ID!, serviceProviderId: ID!): [KnowledgeSource!]!
}
```

---

## Requirements

### 1. Status Badge Mapping

| Schema | UI Label | Badge |
|--------|----------|-------|
| `ACTIVE_SOURCE` | Indexed | `bg-status-success/20 text-status-success` |
| `PROCESSING` | Processing | `bg-status-warning/20 text-status-warning` + spinner |
| `PENDING` | Pending | `bg-text-muted/20 text-text-muted` |
| `FAILED` | Error | `bg-status-error/20 text-status-error` |

### 2. Source Type Mapping

| Schema | UI Label | Icon |
|--------|----------|------|
| `DOCUMENT` | Document | FileText |
| `URL` | Web URL | Globe |
| `TEXT` | Text | AlignLeft |
| `FAQ` | FAQ | HelpCircle |
| `API` | API | Code |

### 3. Sources Table

| Column | Source | Notes |
|--------|--------|-------|
| Type icon | `source.sourceType` | Mapped icon |
| Name | `source.name` | Bold |
| Description | `source.description` | Truncated |
| File Type | `source.fileType` | If DOCUMENT |
| Size | `source.fileSize` | Formatted (KB/MB) |
| Chunks | `source.chunkCount` | Number or "—" |
| Status | `source.status` | Badge with mapping |
| Added | `source.createdAt` | Relative time |
| Actions | — | Resync (FAILED only), Remove |

### 4. Stats Cards (computed from query data)

| Stat | Calculation |
|------|-------------|
| Total Sources | `sources.length` |
| Indexed Sources | `sources.filter(s => s.status === 'ACTIVE_SOURCE').length` |
| Total Chunks | `sources.reduce((acc, s) => acc + (s.chunkCount ?? 0), 0)` |
| Total Size | `sources.reduce((acc, s) => acc + (s.fileSize ?? 0), 0)` formatted |

---

## Implementation Plan

```tsx
'use client';

import { use } from 'react';
import { useQuery } from '@apollo/client';
import { GET_BOT_KNOWLEDGE_SOURCES } from '@/lib/graphql/bots';

export default function BotKnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { serviceProviderId } = useServiceProvider();

  const { data, loading, error } = useQuery(GET_BOT_KNOWLEDGE_SOURCES, {
    variables: { botId: id, serviceProviderId },
  });

  const sources = data?.botKnowledgeSources ?? [];

  if (loading) return <KnowledgeSkeleton />;

  return (
    <div className="p-8 space-y-6">
      {/* Header, stats, sources table */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/knowledge/page.tsx` | **Modify** | Replace mock data with GraphQL query |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add GET_BOT_KNOWLEDGE_SOURCES query |

---

## Acceptance Criteria

- [ ] Knowledge sources fetched from `botKnowledgeSources` query
- [ ] Status badges match `KnowledgeSourceStatus` enum
- [ ] Source type icons match `KnowledgeSourceType` enum
- [ ] Table shows name, description, type, size, chunks, status, date, actions
- [ ] Stats cards computed from real data
- [ ] Loading/error/empty states
- [ ] Mock data fully removed
- [ ] Back navigation to `/bots/[id]`

---

## Dependencies

- **Blocked by**: Task 10.22 (botKnowledgeSources query)
- **Blocks**: Tasks 10.12, 10.13, 10.14 (add/status/remove sources)
- **Related**: Task 10.7 (bot detail — parent page)
