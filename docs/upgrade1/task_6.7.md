# Task 6.7 — File Attachment in Conversations

> **Section**: 6. Conversations  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/conversations/[id]`  
> **File**: `apps/provider/src/components/conversations/MessageBubble.tsx`

---

## Objective

Implement file attachment support in conversations: upload files via DocumentManager, show image previews inline in message bubbles, display documents as downloadable cards, and confirm before sending.

---

## Current State

File attachment button exists (Paperclip icon) but is non-functional. No upload flow, no preview rendering, no document integration.

---

## Requirements

### 1. Upload Flow
1. User clicks Paperclip or pastes image
2. File validated: type check, size limit (10MB)
3. Upload to document-service via presigned URL (task 8.11)
4. On upload complete: send message with file attachment metadata
5. Message sent via `sendMessage` mutation with `messageType: 'FILE'` and attachment URL in metadata

### 2. Image Preview in Bubble
- Images render inline: `max-w-[300px]` with rounded corners
- Click to open full-size in modal/lightbox
- Loading placeholder with shimmer while image loads
- Broken image fallback

### 3. Document Card in Bubble
- Non-image files render as a card:
  ```
  ┌────────────────────────┐
  │ 📄 document.pdf        │
  │ 2.4 MB · PDF           │
  │ [Download]              │
  └────────────────────────┘
  ```
- Download button generates signed URL (task 8.13)
- File type icon: PDF (red), DOC (blue), XLS (green), generic (gray)

### 4. Upload Progress
- While uploading: show progress bar in attachment preview chip
- Disable send until upload completes
- Cancel upload option

### 5. Preview Before Send
- Attached files shown as preview chips above MessageComposer (task 6.6)
- Images: thumbnail + filename
- Documents: icon + filename + size
- Remove button on each chip

---

## Implementation Plan

```tsx
// apps/provider/src/components/conversations/FileAttachment.tsx
import { FileText, Download, Image as ImageIcon, X } from 'lucide-react';

interface FileAttachmentProps {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  isImage: boolean;
}

export function FileAttachment({ fileUrl, fileName, fileSize, fileType, isImage }: FileAttachmentProps) {
  if (isImage) {
    return (
      <div className="mt-2">
        <img src={fileUrl} alt={fileName}
          className="max-w-[300px] rounded-lg border border-border-primary cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
          onClick={() => openLightbox(fileUrl)} />
      </div>
    );
  }

  const iconConfig = getFileIconConfig(fileType);
  return (
    <div className="mt-2 flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg border border-border-secondary max-w-[280px]">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconConfig.bg}`}>
        <FileText size={18} className={iconConfig.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName}</p>
        <p className="text-xs text-text-muted">{formatFileSize(fileSize)} · {fileType.toUpperCase()}</p>
      </div>
      <a href={fileUrl} download={fileName} className="p-1.5 rounded hover:bg-bg-hover text-text-muted">
        <Download size={14} />
      </a>
    </div>
  );
}

function getFileIconConfig(type: string) {
  const map: Record<string, { bg: string; color: string }> = {
    pdf: { bg: 'bg-red-500/10', color: 'text-red-400' },
    doc: { bg: 'bg-blue-500/10', color: 'text-blue-400' },
    docx: { bg: 'bg-blue-500/10', color: 'text-blue-400' },
    xls: { bg: 'bg-green-500/10', color: 'text-green-400' },
    xlsx: { bg: 'bg-green-500/10', color: 'text-green-400' },
  };
  return map[type.toLowerCase()] ?? { bg: 'bg-bg-tertiary', color: 'text-text-muted' };
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/conversations/FileAttachment.tsx` | Create — file attachment display component |
| `apps/provider/src/components/conversations/MessageBubble.tsx` | Modify — render FileAttachment for FILE message types |
| `apps/provider/src/components/conversations/MessageComposer.tsx` | Modify — integrate upload flow |

---

## Acceptance Criteria

- [ ] Images render inline in message bubbles (max-w-300px)
- [ ] Click image opens lightbox/modal
- [ ] Non-image files render as download cards with type icon
- [ ] Upload via presigned URL from document-service
- [ ] Upload progress bar in composer preview
- [ ] Cancel upload option
- [ ] File type validation and 10MB size limit
- [ ] Signed URL for downloads (secure)
- [ ] Broken image fallback

---

## Dependencies

- **Blocked by**: Task 6.5 (MessageBubble component), Task 6.6 (MessageComposer — file picker), Task 8.11 (Presigned URL upload)
- **Blocks**: None
- **Related**: Task 8.6 (Document preview — same image/PDF viewer), Task 8.7 (Share document via conversation)
