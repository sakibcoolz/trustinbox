# Task 8.1 — DocumentManager Component (Grid/List View)

> **Section**: 8. Documents  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/documents`  
> **File**: `apps/provider/src/app/documents/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Upgrade the documents page from hardcoded mock data to a dynamic, GraphQL-powered document manager with grid/list toggle view showing uploaded documents with thumbnails, metadata, and actions.

---

## Current State

```tsx
// apps/provider/src/app/documents/page.tsx — ~160 lines
const mockDocuments = [
  { id: '1', name: 'Service Agreement v2.1.pdf', type: 'PDF', size: '2.4 MB', uploadedAt: '2024-03-10', sharedWith: 3, status: 'Active', category: 'Legal' },
  // ... 5 more hardcoded rows
];
const auditLog = [
  { action: 'Upload', document: 'Service Agreement v2.1.pdf', actor: 'Admin', time: '2024-03-10 10:30' },
  // ... 3 more entries
];
```

**Existing features**: Table view with 7 columns, category filter chips (All/Legal/Compliance/KYC/Internal/Onboarding), search input, Upload button, Eye/Download/Trash action buttons, Audit Trail tab.

**Issues**:
- All 6 documents hardcoded — no real data
- No grid view option
- No real file upload (button is non-functional)
- Status values (Active/Draft/Archived) don't map to schema's `DocumentStatus` (ACTIVE/ARCHIVED/DELETED)
- Category tags are static strings, not from classification system
- No pagination
- Audit log is hardcoded
- No real-time updates

---

## Requirements

### View Modes

| Mode | Layout | Card Content |
|------|--------|--------------|
| **Grid** | 3-4 columns of cards | Thumbnail/icon, name, size, category badge, share count |
| **List** | Table with sortable columns | Name, category, size, shared count, status, uploaded date, actions |

### Document Card Fields (Grid)

| Field | Source | Notes |
|-------|--------|-------|
| **Thumbnail** | Generated or file type icon | Image preview for images, PDF icon for PDFs |
| **Name** | `document.fileName` | Truncate at 40 chars |
| **Size** | `document.fileSize` | Formatted: KB/MB/GB |
| **Category** | `document.classifications[0]` | Badge: invoice, ID, contract, report, general |
| **Share Count** | `document.shareCount` or derived | Number of users shared with |
| **Status** | `document.status` | ACTIVE (green), ARCHIVED (muted), DELETED (hidden) |
| **Upload Date** | `document.createdAt` | Relative time |

### Data Integration
- Fetch from document-service via GraphQL (task 8.12)
- Replace `mockDocuments` entirely
- Cursor-based pagination with load more or page selector

### View Toggle
- Grid/List toggle button in toolbar
- Preference saved to localStorage

### Loading & Empty States
- Loading: 6 skeleton cards (grid) or 5 skeleton rows (list)
- Empty: "No documents yet — upload your first document" with upload CTA
- Error: Error card with retry

---

## Implementation Plan

```tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Grid, List, FileText, Upload, Search } from 'lucide-react';
import { useDocuments } from '@/lib/graphql/documents';

type ViewMode = 'grid' | 'list';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>(
    (localStorage.getItem('docs-view') as ViewMode) ?? 'list'
  );
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? 'All');

  const { data, loading, error } = useDocuments({
    search: search || undefined,
    classification: category !== 'All' ? category : undefined,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header with Upload button */}
      {/* Tabs: Documents | Audit Trail */}
      {/* Toolbar: Search, Category chips, View toggle */}
      {viewMode === 'grid' ? (
        <DocumentGrid documents={data?.documents.nodes ?? []} loading={loading} />
      ) : (
        <DocumentTable documents={data?.documents.nodes ?? []} loading={loading} />
      )}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/documents/page.tsx` | Modify — replace mock data, add grid/list toggle |
| `apps/provider/src/components/DocumentManager.tsx` | Modify — accept GraphQL data types |
| `apps/provider/src/components/documents/DocumentGrid.tsx` | Create — grid view component |
| `apps/provider/src/components/documents/DocumentCard.tsx` | Create — individual document card |

---

## Acceptance Criteria

- [ ] Document list fetched from GraphQL (not hardcoded)
- [ ] Grid view with thumbnail/icon, name, size, category, share count
- [ ] List/table view with sortable columns
- [ ] View mode toggle (grid/list) with localStorage persistence
- [ ] Category filter chips
- [ ] Search by filename
- [ ] Pagination (load more or page selector)
- [ ] Loading skeletons (grid + list variants)
- [ ] Empty state with upload CTA
- [ ] Status badges: ACTIVE (green), ARCHIVED (muted)

---

## Dependencies

- **Blocked by**: Task 1.8 (Skeleton), Task 1.12 (Card), Task 1.13 (Table), Task 8.12 (GraphQL queries)
- **Blocks**: Task 8.2 (upload), Task 8.3 (document card), Task 8.5 (search), Task 8.6 (preview)
- **Related**: Task 4.1 (customer list — similar pattern), Task 5.1 (notification list)
