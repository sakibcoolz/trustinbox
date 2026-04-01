# Task 8.3 — Document Card

> **Section**: 8. Documents  
> **Priority**: P1 — UI component  
> **Estimated Scope**: Small  
> **Route**: `/documents`  
> **Component**: DocumentCard
> **Status**: ✅ Complete

---

## Objective

Create a document card component showing thumbnail/icon, filename, size, upload date, classification badge, and share count for use in both grid and list views.

---

## Current State

```tsx
// apps/provider/src/app/documents/page.tsx (list mode only)
<td className="px-4 py-3">
  <div className="flex items-center gap-2">
    <FileText size={16} className="text-text-muted shrink-0" />
    <span className="font-medium">{d.name}</span>
  </div>
</td>
```

Only a table row with a generic FileText icon. No thumbnail generation, no classification badge, no rich card layout.

---

## Requirements

### Card Fields

| Field | Source | Display |
|-------|--------|---------|
| **Thumbnail** | File type or image preview | Image preview for images, PDF/DOCX/XLSX/generic icons |
| **Filename** | `document.fileName` | Truncate at 40 chars, tooltip for full name |
| **Size** | `document.fileSize` | Formatted: `formatFileSize()` |
| **Upload Date** | `document.createdAt` | Relative time |
| **Classification** | `document.classifications[0]` | Badge: invoice (purple), ID (blue), contract (green), report (orange), general (gray) |
| **Share Count** | `document.shareCount` | "Shared with X users" |
| **Status** | `document.status` | Small dot indicator |

### Grid Card Layout
```
┌─────────────────────┐
│  [Thumbnail/Icon]    │  80px height
│                      │
├─────────────────────┤
│  filename.pdf        │  Font-medium, truncated
│  Legal · 2.4 MB      │  text-text-muted
│  Shared with 3       │  text-xs
│  [👁] [⬇] [🗑]     │  Action icons
└─────────────────────┘
```

### Classification Colors

| Classification | Color |
|---------------|-------|
| invoice | `bg-purple-500/10 text-purple-400` |
| ID | `bg-accent-blue/10 text-accent-blue` |
| contract | `bg-status-success/10 text-status-success` |
| report | `bg-accent-orange/10 text-accent-orange` |
| general | `bg-border-secondary text-text-muted` |

### File Type Icons

| Type | Icon | Color |
|------|------|-------|
| PDF | `FileText` | Red (#ef4444) |
| DOCX | `FileText` | Blue (#3b82f6) |
| XLSX | `Sheet` | Green (#22c55e) |
| Image | `Image` | Purple (#a855f7) |
| Other | `File` | Gray |

---

## Implementation Plan

```tsx
import { FileText, Image, File, Eye, Download, Trash2 } from 'lucide-react';

interface DocumentCardProps {
  document: Document;
  onPreview: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

function DocumentCard({ document, onPreview, onDownload, onDelete }: DocumentCardProps) {
  const icon = getFileIcon(document.fileType);
  const classification = document.classifications?.[0];

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden hover:border-border-active transition-colors group">
      {/* Thumbnail area */}
      <div className="h-20 bg-bg-surface flex items-center justify-center">
        <icon.component size={32} className={icon.color} />
      </div>

      {/* Details */}
      <div className="p-3 space-y-1">
        <p className="text-sm font-medium truncate" title={document.fileName}>{document.fileName}</p>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {classification && <span className={`px-1.5 py-0.5 rounded text-xs ${classificationColors[classification]}`}>{classification}</span>}
          <span>{formatFileSize(document.fileSize)}</span>
        </div>
        <p className="text-xs text-text-muted">Shared with {document.shareCount ?? 0}</p>
      </div>

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onPreview(document.id)} className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><Eye size={14} /></button>
        <button onClick={() => onDownload(document.id)} className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><Download size={14} /></button>
        <button onClick={() => onDelete(document.id)} className="p-1.5 rounded hover:bg-bg-hover text-status-error"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/documents/DocumentCard.tsx` | Create — grid card component |
| `apps/provider/src/components/documents/DocumentGrid.tsx` | Modify — use DocumentCard |

---

## Acceptance Criteria

- [ ] Card shows thumbnail or file type icon
- [ ] Filename truncated with tooltip
- [ ] File size formatted (KB/MB/GB)
- [ ] Classification badge with color
- [ ] Share count displayed
- [ ] Action buttons: Preview, Download, Delete
- [ ] Actions reveal on hover (group-hover)
- [ ] Card border highlights on hover

---

## Dependencies

- **Blocked by**: Task 8.1 (DocumentManager grid view)
- **Blocks**: Task 8.5 (search highlights in cards), Task 8.6 (preview on click)
- **Related**: Task 6.7 (file attachment cards in conversations)
