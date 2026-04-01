# Task 4.12 — Customer Notes/Tags

> **Section**: 4. Customers  
> **Priority**: P2  
> **Estimated Scope**: Medium  
> **Route**: `/customers/[virtualId]`  
> **File**: `apps/provider/src/app/customers/[virtualId]/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Implement internal organization notes and tags for a customer — local to the organization and never shared with the user. Features include adding/editing/deleting notes and managing custom tags.

---

## Current State

No notes or tags functionality exists in the customer detail page.

---

## Requirements

### 1. Notes Section
- Positioned in the Overview tab, below the privacy status card
- Chronological list of notes, newest first
- Each note: content (text), author (team member name), timestamp
- "Add note" button → inline text area with save/cancel
- Edit note → in-place editing
- Delete note → confirmation prompt

### 2. Tags Section
- Tag bar displayed beneath the customer profile header
- Existing tags as removable chips: `bg-bg-tertiary text-text-secondary` with X button
- "Add tag" button → dropdown/autocomplete of existing org tags OR create new
- Tags are org-scoped, shared across team members
- Predefined tag categories: VIP, High Priority, Needs Follow-up, Escalated, New Customer

### 3. Component APIs

```typescript
interface CustomerNote {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
}

interface CustomerTag {
  id: string;
  label: string;
  color?: string; // Tailwind color class
}

interface CustomerNotesProps {
  virtualId: string;
  notes: CustomerNote[];
  onAddNote: (content: string) => void;
  onEditNote: (id: string, content: string) => void;
  onDeleteNote: (id: string) => void;
}

interface CustomerTagsProps {
  virtualId: string;
  tags: CustomerTag[];
  availableTags: CustomerTag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (label: string) => void;
}
```

### 4. Security / Privacy
- Notes are org-internal only, never exposed to the customer
- Only CONTENT_MANAGER+ can delete other users' notes
- All users can add notes
- Tag management (create/delete global tags) requires SP_ADMIN

### 5. Persistence
- Notes and tags stored via GraphQL mutations (requires backend support)
- Optimistic updates for add/edit operations
- If backend not ready, fall back to localStorage with migration plan

---

## Implementation Plan

```tsx
// apps/provider/src/components/customers/CustomerNotes.tsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { formatRelativeTime } from '@/lib/utils/date';

export function CustomerNotes({ virtualId, notes, onAddNote, onEditNote, onDeleteNote }: CustomerNotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const { user } = useAuth();
  const canDeleteOthers = usePermission('customers:admin');

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Internal Notes</h3>
        <button onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-xs text-accent-blue hover:bg-accent-blue/10 px-2 py-1 rounded-lg">
          <Plus size={12} /> Add Note
        </button>
      </div>
      {isAdding && (
        <div className="mb-4 space-y-2">
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm ..." placeholder="Add a note…" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setIsAdding(false); setNewNote(''); }} className="text-xs text-text-muted">Cancel</button>
            <button onClick={() => { onAddNote(newNote); setNewNote(''); setIsAdding(false); }}
              disabled={!newNote.trim()} className="text-xs text-accent-blue font-medium disabled:opacity-50">Save</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {notes.map(note => (
          <div key={note.id} className="p-3 rounded-lg bg-bg-hover">
            <p className="text-sm">{note.content}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-muted">{note.authorName} · {formatRelativeTime(note.createdAt)}</span>
              <div className="flex gap-1">
                {(note.authorId === user?.id) && <button onClick={() => onEditNote(note.id, note.content)}><Edit2 size={12} className="text-text-muted" /></button>}
                {(note.authorId === user?.id || canDeleteOthers) && <button onClick={() => onDeleteNote(note.id)}><Trash2 size={12} className="text-text-muted" /></button>}
              </div>
            </div>
          </div>
        ))}
        {notes.length === 0 && <p className="text-xs text-text-muted text-center py-4">No notes yet</p>}
      </div>
    </Card>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/customers/CustomerNotes.tsx` | Create |
| `apps/provider/src/components/customers/CustomerTags.tsx` | Create |
| `apps/provider/src/app/customers/[virtualId]/page.tsx` | Modify — add notes/tags to Overview tab |

---

## Acceptance Criteria

- [ ] Add/edit/delete notes with inline editing
- [ ] Notes show author name and relative timestamp
- [ ] Only note author can edit; CONTENT_MANAGER+ can delete others' notes
- [ ] Tags displayed as removable chips
- [ ] Add tag via autocomplete/dropdown
- [ ] Create new tag option
- [ ] Notes are org-internal (never shared with customer)
- [ ] Optimistic updates for add/edit
- [ ] Empty states for no notes and no tags

---

## Dependencies

- **Blocked by**: Task 4.7 (Customer detail page), Task 1.12 (Card), Task 2.10 (usePermission)
- **Blocks**: None
- **Related**: Task 4.8 (privacy — same overview tab section)
