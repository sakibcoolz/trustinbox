# Task 8.6 — Document Preview

> **Section**: 8. Documents  
> **Priority**: P1 — UX enhancement  
> **Estimated Scope**: Medium  
> **Route**: `/documents`  
> **Component**: DocumentPreview modal/drawer
> **Status**: ✅ Complete

---

## Objective

Implement in-app document preview for images and PDFs in a modal or drawer, with zoom, navigation, and download option.

---

## Current State

Eye button exists but does nothing:
```tsx
<button className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><Eye size={14} /></button>
```

---

## Requirements

### Supported Preview Types

| File Type | Preview Method |
|-----------|---------------|
| Images (PNG, JPG, GIF, WebP) | `<img>` with zoom controls |
| PDF | `<iframe>` with PDF.js or native browser PDF viewer |
| DOCX | Server-side PDF conversion or "Download to view" |
| XLSX | "Download to view" |
| TXT/MD | Rendered in `<pre>` or markdown renderer |
| Other | "Preview not available — Download to view" |

### Preview Modal

```
┌──────────────────────────────────────┐
│  filename.pdf           [↓] [✕]     │  Header with download + close
├──────────────────────────────────────┤
│                                       │
│     [Document Preview Content]        │  Main preview area
│                                       │
│                                       │
├──────────────────────────────────────┤
│  [←] Page 1 of 5 [→]  [–] 100% [+] │  Navigation + zoom (PDF/images)
└──────────────────────────────────────┘
```

### Preview URL
- Use signed URL from document-service (expires in 15 min)
- Request fresh URL on preview open
- Hide URL from user (no direct link exposure)

### UX
- Modal overlay with backdrop blur
- Keyboard shortcuts: Escape to close, arrows to navigate pages
- Loading skeleton while fetching signed URL
- Error state: "Failed to load preview" with retry

---

## Implementation Plan

```tsx
import { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface DocumentPreviewProps {
  documentId: string;
  fileName: string;
  fileType: string;
  isOpen: boolean;
  onClose: () => void;
}

function DocumentPreview({ documentId, fileName, fileType, isOpen, onClose }: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (isOpen) {
      // Fetch signed URL
      fetchSignedUrl(documentId).then(url => {
        setPreviewUrl(url);
        setLoading(false);
      });
    }
  }, [isOpen, documentId]);

  if (!isOpen) return null;

  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);
  const isText = /\.(txt|md|csv)$/i.test(fileName);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-bg-elevated border-b border-border-primary">
        <span className="text-sm font-medium">{fileName}</span>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-bg-hover rounded"><Download size={16} /></button>
          <button onClick={onClose} className="p-2 hover:bg-bg-hover rounded"><X size={16} /></button>
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        {isImage && <img src={previewUrl!} className="max-w-full" style={{ transform: `scale(${zoom / 100})` }} />}
        {isPdf && <iframe src={previewUrl!} className="w-full h-full" />}
        {isText && <pre className="text-sm text-text-primary bg-bg-surface p-4 rounded-lg max-w-3xl w-full overflow-auto" />}
        {!isImage && !isPdf && !isText && (
          <div className="text-center text-text-muted">
            <p>Preview not available for this file type</p>
            <button className="mt-2 text-accent-blue hover:underline text-sm">Download to view</button>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-4 py-3 bg-bg-elevated border-t border-border-primary">
        <button onClick={() => setZoom(z => Math.max(25, z - 25))}><ZoomOut size={16} /></button>
        <span className="text-xs text-text-muted">{zoom}%</span>
        <button onClick={() => setZoom(z => Math.min(300, z + 25))}><ZoomIn size={16} /></button>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/documents/DocumentPreview.tsx` | Create — preview modal |
| `apps/provider/src/app/documents/page.tsx` | Modify — wire Eye button to preview |

---

## Acceptance Criteria

- [ ] Image preview with zoom controls
- [ ] PDF preview via iframe
- [ ] Text/markdown rendered inline
- [ ] Unsupported types show "Download to view"
- [ ] Signed URL fetched on open (15 min expiry)
- [ ] Loading skeleton during URL fetch
- [ ] Download button in header
- [ ] Escape key closes modal
- [ ] Error state with retry

---

## Dependencies

- **Blocked by**: Task 8.1 (DocumentManager), Task 8.13 (signed URL generation)
- **Blocks**: None
- **Related**: Task 1.16 (Modal component), Task 6.7 (file attachment preview in conversations)
