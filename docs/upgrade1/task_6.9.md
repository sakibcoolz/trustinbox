# Task 6.9 — Conversation Actions Toolbar

> **Section**: 6. Conversations  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/conversations/[id]`  
> **File**: `apps/provider/src/components/conversations/ConversationHeader.tsx`
> **Status**: ✅ Complete

---

## Objective

Implement an actions toolbar in the conversation header with "Request Callback", "Share Document", "Archive", and "Assign to Agent" actions, each permission-gated and policy-aware.

---

## Current State

```tsx
// apps/provider/src/app/conversations/[id]/page.tsx — header actions
<div className="flex items-center gap-2">
  <button className="..." title="Request callback"><PhoneCall size={16} /></button>
  <button className="..."><MoreVertical size={16} /></button>
</div>
```

**Issues**: Callback button is non-functional, no share/archive/assign actions, no more-menu dropdown, no permission gating.

---

## Requirements

### 1. Action Buttons

| Action | Icon | Permission | Condition |
|--------|------|-----------|-----------|
| **Request Callback** | `PhoneCall` | `callbacks:create` | Only if conv status is OPEN |
| **Share Document** | `FileText` | `documents:share` | Only if conv status is OPEN |
| **Archive** | `Archive` | `conversations:manage` | Only if conv status is OPEN or CLOSED |
| **Assign to Agent** | `UserPlus` | `conversations:manage` | Only if conv status is OPEN |

### 2. More Menu (overflow)
- Three-dot button opens dropdown with less-common actions
- Archive and Assign moved to more-menu if space is limited
- Dropdown positioned below button with backdrop close

### 3. Request Callback Flow
- Opens drawer/modal: pre-fill customer from conversation
- Select preferred time slots, add reason/notes
- Calls `createCallbackRequest` mutation (task 7.10)
- Toast on success

### 4. Share Document Flow
- Opens document picker modal (task 8.7)
- Select from uploaded documents
- Sends as FILE message in conversation
- Uses signed URL

### 5. Archive Flow
- Confirmation modal: "Archive this conversation? It can be unarchived later."
- Calls archive mutation
- Conversation removed from active list
- Redirect to conversation list after archive

### 6. Assign to Agent Flow
- Opens dropdown of team members with AGENT+ role
- Show current assignee (if any) with checkmark
- Calls assign mutation
- System message added: "Conversation assigned to [Agent Name]"
- Toast on success

---

## Implementation Plan

```tsx
// apps/provider/src/components/conversations/ConversationHeader.tsx
import { ArrowLeft, PhoneCall, FileText, Archive, UserPlus, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { usePermission } from '@/hooks/usePermission';
import Link from 'next/link';

export function ConversationHeader({ conversation }: { conversation: ConversationNode }) {
  const [showMore, setShowMore] = useState(false);
  const canCallback = usePermission('callbacks:create');
  const canShare = usePermission('documents:share');
  const canManage = usePermission('conversations:manage');
  const isOpen = conversation.status === 'OPEN';

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border-primary bg-bg-secondary">
      <div className="flex items-center gap-3">
        <Link href="/conversations" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium font-mono">{conversation.customerVid}</span>
            <Badge variant={statusVariant(conversation.status)}>{conversation.status}</Badge>
          </div>
          <p className="text-xs text-text-muted">{conversation.assignee}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {canCallback && isOpen && (
          <ActionButton icon={PhoneCall} label="Request Callback" onClick={handleRequestCallback} />
        )}
        {canShare && isOpen && (
          <ActionButton icon={FileText} label="Share Document" onClick={handleShareDocument} />
        )}
        <div className="relative">
          <button onClick={() => setShowMore(!showMore)} className="p-2 rounded-lg hover:bg-bg-hover text-text-muted">
            <MoreVertical size={16} />
          </button>
          {showMore && (
            <DropdownMenu>
              {canManage && isOpen && <MenuItem icon={UserPlus} label="Assign to Agent" onClick={handleAssign} />}
              {canManage && <MenuItem icon={Archive} label="Archive" onClick={handleArchive} />}
            </DropdownMenu>
          )}
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
| `apps/provider/src/components/conversations/ConversationHeader.tsx` | Create — extracted header with actions |
| `apps/provider/src/app/conversations/[id]/page.tsx` | Modify — replace inline header with ConversationHeader |

---

## Acceptance Criteria

- [ ] "Request Callback" button — opens form, pre-fills customer
- [ ] "Share Document" button — opens document picker
- [ ] "Archive" in more menu — confirmation modal, calls mutation
- [ ] "Assign to Agent" in more menu — agent dropdown, calls mutation
- [ ] All actions permission-gated
- [ ] Actions disabled for closed/archived conversations
- [ ] More menu dropdown with backdrop close
- [ ] Toast notifications on success/error

---

## Dependencies

- **Blocked by**: Task 6.5 (ConversationPanel), Task 2.10 (usePermission), Task 1.7 (Toast), Task 1.16 (Modal)
- **Blocks**: None
- **Related**: Task 7.5 (Create callback — same form), Task 8.7 (Share document — same picker), Task 6.10 (Assign to agent detail)
