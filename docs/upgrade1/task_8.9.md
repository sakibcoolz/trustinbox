# Task 8.9 — Delete Document

> **Section**: 8. Documents  
> **Priority**: P1 — CRUD action  
> **Estimated Scope**: Small  
> **Route**: `/documents`  
> **Component**: DeleteConfirmationModal
> **Status**: ✅ Complete

---

## Objective

Implement soft delete for documents with a confirmation modal showing warnings about active shares, linked conversations, and the option to archive instead.

---

## Current State

```tsx
// apps/provider/src/components/DocumentManager.tsx
<button onClick={() => onDelete?.(doc.id)} className="p-1.5 rounded hover:bg-bg-hover text-status-error"><Trash2 size={14} /></button>
```

Delete button fires the `onDelete` prop but no real deletion logic exists.

---

## Requirements

### Confirmation Modal

```
┌──────────────────────────────────────┐
│  ⚠ Delete Document                   │
├──────────────────────────────────────┤
│  Are you sure you want to delete     │
│  "Service Agreement v2.1.pdf"?       │
│                                       │
│  ⚠ This document is shared with      │
│    3 customers                        │
│  ⚠ Referenced in 2 conversations      │
│                                       │
│  [Archive Instead]     [Delete]       │
└──────────────────────────────────────┘
```

### Warnings
- Show share count if > 0
- Show linked conversation count if > 0
- Warn that shared links will stop working
- Suggest "Archive Instead" as safer option

### Soft Delete
- Mutation sets `status = DELETED` (backend soft delete)
- Document hidden from list but preserved in DB
- Shared links return "Document no longer available"
- Optimistic removal from UI list

### Archive Alternative
- Archive sets `status = ARCHIVED`
- Document still accessible via shared links
- Hidden from default view but shown in "Archived" filter

### Permissions
- Requires `documents:delete` permission

---

## Implementation Plan

```tsx
function DeleteDocumentModal({ document, isOpen, onClose }: Props) {
  const [deleteDocument, { loading: deleting }] = useDeleteDocument();
  const [archiveDocument, { loading: archiving }] = useArchiveDocument();

  async function handleDelete() {
    await deleteDocument({ variables: { id: document.id } });
    toast({ title: 'Document deleted', variant: 'success' });
    onClose();
  }

  async function handleArchive() {
    await archiveDocument({ variables: { id: document.id } });
    toast({ title: 'Document archived', variant: 'success' });
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-elevated border border-border-primary rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-2 text-status-warning">
          <AlertTriangle size={20} />
          <h2 className="text-lg font-semibold">Delete Document</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Are you sure you want to delete "{document.fileName}"?
        </p>
        {document.shareCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-status-warning bg-status-warning/10 px-3 py-2 rounded-lg">
            <AlertTriangle size={14} /> Shared with {document.shareCount} customers
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleArchive} disabled={archiving}
            className="flex-1 py-2.5 border border-border-secondary rounded-lg text-sm hover:bg-bg-hover">
            Archive Instead
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 py-2.5 bg-status-error text-white rounded-lg text-sm font-medium">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/documents/DeleteDocumentModal.tsx` | Create — confirmation modal |
| `apps/provider/src/app/documents/page.tsx` | Modify — wire delete button to modal |
| `apps/provider/src/lib/graphql/documents.ts` | Modify — add deleteDocument, archiveDocument mutations |

---

## Acceptance Criteria

- [ ] Confirmation modal with document name
- [ ] Warning for shared documents
- [ ] Warning for conversation-linked documents
- [ ] "Archive Instead" option
- [ ] Soft delete (status = DELETED)
- [ ] Optimistic removal from list
- [ ] Toast on success
- [ ] Requires `documents:delete` permission
- [ ] Cannot delete already-deleted documents

---

## Dependencies

- **Blocked by**: Task 1.16 (Modal), Task 8.1 (DocumentManager), Task 8.12 (GraphQL mutations)
- **Blocks**: None
- **Related**: Task 8.7 (share — impacts delete warnings), Task 10.10 (bot delete — similar confirmation pattern)
