# Task 8.10 — Bulk Download

> **Section**: 8. Documents  
> **Priority**: P2 — Batch operation  
> **Estimated Scope**: Medium  
> **Route**: `/documents`  
> **Component**: Bulk action toolbar
> **Status**: ✅ Complete

---

## Objective

Implement multi-select with bulk download capability, generating a zip file of selected documents for the user.

---

## Current State

No multi-select or bulk download exists. Documents can only be downloaded individually.

---

## Requirements

### Multi-Select

| Feature | Detail |
|---------|--------|
| **Select checkbox** | Checkbox on each document card/row |
| **Select all** | Header checkbox / "Select All" button |
| **Count** | "X selected" indicator |
| **Max** | Maximum 20 documents per bulk download |

### Bulk Download Flow

```
1. Select multiple documents
2. Click "Download Selected"
3. Client fetches signed URLs for all selected
4. Client downloads files and creates zip (using JSZip)
5. Progress: "Downloading 3 of 10…"
6. Triggers browser download of zip file
```

### Bulk Action Toolbar
- Appears at bottom when >= 1 document selected
- Shows: "X selected" + "Download Selected" + "Clear Selection"
- Download button disabled while processing
- Progress percentage shown during zip creation

### Technical Approach
- Use `JSZip` library for client-side zip creation
- Fetch each file via signed URL (parallel, max 3 concurrent)
- Stream into zip
- `saveAs` for browser download trigger
- Alternative: server-side zip endpoint (if file sizes too large)

---

## Implementation Plan

```tsx
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

async function downloadAsZip(documents: Document[]) {
  const zip = new JSZip();

  for (const doc of documents) {
    const signedUrl = await getSignedUrl(doc.id);
    const response = await fetch(signedUrl);
    const blob = await response.blob();
    zip.file(doc.fileName, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `documents-${Date.now()}.zip`);
}

// Bulk toolbar
{selected.size > 0 && (
  <div className="sticky bottom-0 bg-bg-elevated border-t border-border-primary px-4 py-3 flex items-center gap-4">
    <span className="text-sm text-text-secondary">{selected.size} selected</span>
    <button onClick={() => handleBulkDownload()} disabled={downloading}
      className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium disabled:opacity-50">
      {downloading ? `Downloading ${progress}/${selected.size}…` : 'Download Selected'}
    </button>
    <button onClick={() => setSelected(new Set())}
      className="text-xs text-text-muted hover:text-text-secondary ml-auto">Clear</button>
  </div>
)}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/documents/BulkDownloadToolbar.tsx` | Create — bulk action toolbar |
| `apps/provider/src/app/documents/page.tsx` | Modify — add checkboxes, selection state, toolbar |

---

## Acceptance Criteria

- [ ] Checkbox on each document (grid + list views)
- [ ] Select all functionality
- [ ] "X selected" count in toolbar
- [ ] Bulk download creates zip via JSZip
- [ ] Progress indicator during download
- [ ] Maximum 20 documents per download
- [ ] Browser download triggered on completion
- [ ] Clear selection button
- [ ] Toolbar visible only when items selected

---

## Dependencies

- **Blocked by**: Task 8.1 (DocumentManager), Task 8.13 (signed URLs for download)
- **Blocks**: None
- **Related**: Task 7.9 (bulk actions in callbacks — same toolbar pattern), Task 4.6 (bulk actions in customers)
