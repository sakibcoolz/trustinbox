# Task 8.2 — Document Upload Zone

> **Section**: 8. Documents  
> **Priority**: P0 — Core action  
> **Estimated Scope**: Large  
> **Route**: `/documents`  
> **Component**: UploadZone
> **Status**: ✅ Complete

---

## Objective

Implement a drag-and-drop upload zone with file picker, multi-file upload support, and progress bars using presigned URLs from the document-service.

---

## Current State

```tsx
// apps/provider/src/components/DocumentManager.tsx
<div onDragOver={...} onDragLeave={...} onDrop={handleDrop}
  className="border-2 border-dashed rounded-xl p-6 text-center">
  <Upload size={20} className="mx-auto text-text-muted mb-1" />
  <p className="text-sm text-text-muted">Drop files here or <button>browse</button></p>
  <p className="text-xs text-text-muted mt-0.5">PDF, TXT, MD — Max 50 MB</p>
</div>
```

**Issues**:
- Drop handler calls `onUpload?.(file)` but does nothing real
- Single file only, no multi-file
- No progress tracking
- No file type validation
- No size limit enforcement
- Browser button is non-functional

---

## Requirements

### Upload Flow

```
1. User drops files or clicks browse
2. Validate: file type, size, count
3. For each file:
   a. Request presigned URL from document-service
   b. Upload directly to MinIO/S3 via presigned URL
   c. Track progress via XHR/fetch
   d. On complete: create document record in document-service
4. Show progress bars during upload
5. On all complete: refresh document list
```

### File Validation

| Rule | Constraint |
|------|-----------|
| **Allowed types** | PDF, DOCX, XLSX, PNG, JPG, JPEG, GIF, TXT, MD, CSV |
| **Max file size** | 50 MB per file |
| **Max concurrent** | 3 simultaneous uploads |
| **Max batch** | 10 files per batch |

### Progress UI

| State | Display |
|-------|---------|
| Queued | File name + "Waiting…" |
| Uploading | File name + progress bar (0-100%) + cancel button |
| Complete | File name + green checkmark |
| Failed | File name + red X + retry button |
| Cancelled | File name + gray + remove button |

### Drag & Drop
- Full drop zone with border highlight on drag over
- Accept multiple files
- Visual feedback (border color change + backdrop)

### Presigned URL Integration
- Call `generatePresignedURL` from document-service (via GraphQL or REST)
- Upload directly to object storage (bypass server files)
- Content-Type header from file MIME type
- On upload complete: call `createDocument` mutation to register in DB

---

## Implementation Plan

```tsx
interface UploadItem {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'complete' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
}

function UploadZone({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(item: UploadItem) {
    // 1. Get presigned URL
    const { url, s3Key } = await getPresignedUrl(item.file.name, item.file.type);

    // 2. Upload via XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      setUploads(prev => prev.map(u =>
        u.id === item.id ? { ...u, progress: (e.loaded / e.total) * 100 } : u
      ));
    };

    // 3. On complete, register document
    xhr.onload = async () => {
      await createDocument({ fileName: item.file.name, s3Key, fileSize: item.file.size, fileType: item.file.type });
      setUploads(prev => prev.map(u =>
        u.id === item.id ? { ...u, status: 'complete', progress: 100 } : u
      ));
    };

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', item.file.type);
    xhr.send(item.file);
  }

  return (
    <div>
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-accent-blue bg-accent-blue/5' : 'border-border-secondary hover:border-border-active'
        }`}>
        <Upload size={24} className="mx-auto text-text-muted mb-2" />
        <p className="text-sm text-text-secondary">
          Drop files here or <input type="file" multiple onChange={handleFileSelect} className="hidden" />
          <button className="text-accent-blue hover:underline">browse</button>
        </p>
        <p className="text-xs text-text-muted mt-1">PDF, DOCX, XLSX, PNG, JPG — Max 50 MB</p>
      </div>
      {/* Upload progress list */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/documents/UploadZone.tsx` | Create — drag-drop + file picker + progress |
| `apps/provider/src/app/documents/page.tsx` | Modify — integrate UploadZone |
| `apps/provider/src/components/DocumentManager.tsx` | Modify — use UploadZone |

---

## Acceptance Criteria

- [ ] Drag-and-drop file upload with visual feedback
- [ ] Browse button opens native file picker (multi-file)
- [ ] File type and size validation (50 MB max)
- [ ] Progress bars per file (0-100%)
- [ ] Max 3 concurrent uploads
- [ ] Cancel button during upload
- [ ] Retry button for failed uploads
- [ ] Presigned URL flow (no server-side file handling)
- [ ] Document registered in DB after upload completes
- [ ] Document list refreshes after all uploads

---

## Dependencies

- **Blocked by**: Task 8.1 (DocumentManager page), Task 8.11 (presigned URL backend)
- **Blocks**: Task 8.3 (document card — shows uploaded docs)
- **Related**: Task 6.7 (file attachment in conversations — similar upload pattern)
