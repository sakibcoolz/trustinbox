# Task 8.8 — Document Version History

> **Section**: 8. Documents  
> **Priority**: P2 — Version management  
> **Estimated Scope**: Medium  
> **Route**: `/documents`  
> **Component**: VersionHistory drawer/panel
> **Status**: ✅ Complete

---

## Objective

Implement version history display for documents, showing all versions with timestamps, download links, and ability to rollback or download previous versions.

---

## Current State

No version history UI exists. The backend proto defines:
```protobuf
rpc CreateDocumentVersion(CreateDocumentVersionRequest) returns (DocumentVersion);
rpc ListDocumentVersions(ListDocumentVersionsRequest) returns (ListDocumentVersionsResponse);
rpc GetDocumentVersion(GetDocumentVersionRequest) returns (DocumentVersion);
```

Backend entity has `DocumentVersion` with ID, DocumentID, VersionNumber, S3Key, FileSize, UploadedBy, CreatedAt.

---

## Requirements

### Version Timeline

| Field | Source | Display |
|-------|--------|---------|
| **Version** | `version.versionNumber` | "v1", "v2", etc. |
| **Uploaded At** | `version.createdAt` | Relative + absolute |
| **Uploaded By** | `version.uploadedBy` | Agent name |
| **File Size** | `version.fileSize` | Formatted |
| **Actions** | Download, Preview, Set as Current | Icon buttons |

### UI Layout
- Right-side drawer (task 1.15 pattern)
- Opens from document actions menu
- Timeline layout showing versions chronologically (newest first)
- Current version highlighted with badge

### Upload New Version
- "Upload New Version" button at top of drawer
- Opens file picker (single file, same type restriction)
- Uploads via presigned URL flow (same as task 8.2)
- Increments version number

---

## Implementation Plan

```tsx
function VersionHistory({ documentId, isOpen, onClose }: Props) {
  const { data, loading } = useDocumentVersions(documentId);
  const versions = data?.documentVersions ?? [];

  return (
    <div className={`fixed top-0 right-0 h-full w-96 bg-bg-elevated border-l border-border-primary transform transition-transform z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 border-b border-border-primary flex items-center justify-between">
        <h2 className="text-lg font-semibold">Version History</h2>
        <button onClick={onClose}><X size={18} /></button>
      </div>

      <div className="p-4">
        <button className="w-full py-2 border border-dashed border-border-secondary rounded-lg text-sm text-text-muted hover:border-accent-blue">
          + Upload New Version
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {versions.map((v, i) => (
          <div key={v.id} className="flex items-start gap-3 p-3 bg-bg-card border border-border-primary rounded-lg">
            <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-xs font-medium text-accent-blue">
              v{v.versionNumber}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{formatRelativeTime(v.createdAt)}</p>
              <p className="text-xs text-text-muted">By {v.uploadedBy} · {formatFileSize(v.fileSize)}</p>
            </div>
            <div className="flex gap-1">
              <button className="p-1 hover:bg-bg-hover rounded"><Download size={14} /></button>
              <button className="p-1 hover:bg-bg-hover rounded"><Eye size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/documents/VersionHistory.tsx` | Create — version history drawer |
| `apps/provider/src/app/documents/page.tsx` | Modify — add version history action to document row |
| `apps/provider/src/lib/graphql/documents.ts` | Modify — add documentVersions query |

---

## Acceptance Criteria

- [ ] Version history drawer opens from document actions
- [ ] Version timeline with number, date, uploader, size
- [ ] Current version highlighted
- [ ] Download previous versions via signed URL
- [ ] Preview previous versions
- [ ] Upload new version increments version number
- [ ] Drawer slides in/out with transition

---

## Dependencies

- **Blocked by**: Task 1.15 (Drawer), Task 8.1 (DocumentManager), Task 8.12 (GraphQL queries)
- **Blocks**: None
- **Related**: Task 8.2 (upload zone — reuse for version upload), Task 8.6 (preview — reuse for version preview)
