# Task 6.11 — Conversation Info Sidebar

> **Section**: 6. Conversations  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/conversations/[id]`  
> **File**: `apps/provider/src/components/conversations/ConversationInfoSidebar.tsx`
> **Status**: ✅ Complete

---

## Objective

Implement a collapsible right sidebar in the conversation detail view showing the customer profile card, shared documents list, callback history, and conversation metadata.

---

## Current State

No info sidebar exists. Customer info is shown only in the header (virtual ID + status + assignee).

---

## Requirements

### 1. Sidebar Layout
- Right panel: 320px width, collapsible
- Toggle button in conversation header (Info icon)
- Slide-in animation from right
- On mobile: full-width overlay drawer

### 2. Sections

**Customer Profile Card**:
- Avatar (initials)
- Virtual ID (monospace, link to `/customers/[vid]`)
- Display name (if available)
- Member since date
- Privacy preference summary (task 4.8 mini-version)

**Quick Actions**:
- "View Full Profile" → `/customers/[vid]`
- "Check Policy" → triggers inline policy check
- "Send Notification" → `/notifications/compose?recipients=[vid]`

**Shared Documents** (task 8.7):
- List of documents shared in this conversation
- Thumbnail/icon + filename + shared date
- Click to preview or download
- "Share Document" button at bottom

**Callback History**:
- List of callback requests related to this customer
- Status badge, requested date, notes preview
- Link to callback detail

**Conversation Metadata**:
- Started: date/time
- Last active: relative time
- Total messages: count
- Assigned to: agent name
- Status: badge

### 3. Data Fetching
- Sidebar data fetched as part of conversation detail query (expanded fields)
- Or lazy-loaded on sidebar open for performance
- Documents and callbacks may need separate queries

---

## Implementation Plan

```tsx
// apps/provider/src/components/conversations/ConversationInfoSidebar.tsx
import { X, ExternalLink, FileText, PhoneCall, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface ConversationInfoSidebarProps {
  conversation: ConversationDetail;
  open: boolean;
  onClose: () => void;
}

export function ConversationInfoSidebar({ conversation, open, onClose }: ConversationInfoSidebarProps) {
  if (!open) return null;

  return (
    <div className="w-80 border-l border-border-primary bg-bg-secondary flex flex-col h-full animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-primary">
        <h3 className="text-sm font-semibold">Conversation Info</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover text-text-muted"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Customer Profile */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center text-sm font-medium">
              {conversation.customerVid.slice(-2)}
            </div>
            <div>
              <Link href={`/customers/${conversation.customerVid}`}
                className="text-sm font-medium font-mono text-accent-blue hover:underline flex items-center gap-1">
                {conversation.customerVid} <ExternalLink size={10} />
              </Link>
              <p className="text-xs text-text-muted">Member since {conversation.customerJoinedAt}</p>
            </div>
          </div>
        </section>

        {/* Shared Documents */}
        <section>
          <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Shared Documents</h4>
          {conversation.sharedDocuments.length === 0 ? (
            <p className="text-xs text-text-muted">No documents shared</p>
          ) : (
            <div className="space-y-2">
              {conversation.sharedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-hover">
                  <FileText size={14} className="text-text-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-text-muted">{doc.sharedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Callback History */}
        <section>
          <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Callback History</h4>
          {/* Similar list of callback requests */}
        </section>

        {/* Metadata */}
        <section>
          <h4 className="text-xs text-text-muted uppercase tracking-wider mb-2">Details</h4>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-text-muted">Started</dt>
              <dd>{conversation.createdAt}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Messages</dt>
              <dd>{conversation.messageCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Assigned to</dt>
              <dd>{conversation.assignee ?? 'Unassigned'}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/conversations/ConversationInfoSidebar.tsx` | Create |
| `apps/provider/src/app/conversations/[id]/page.tsx` | Modify — add sidebar toggle + render sidebar |

---

## Acceptance Criteria

- [ ] 320px right sidebar, collapsible with toggle button
- [ ] Customer profile: avatar, VID (link), name, member since
- [ ] Quick actions: View Profile, Check Policy, Send Notification
- [ ] Shared documents list (or empty state)
- [ ] Callback history list (or empty state)
- [ ] Conversation metadata: started, messages, assigned, status
- [ ] Slide-in animation
- [ ] Mobile: full-width overlay drawer
- [ ] X button to close

---

## Dependencies

- **Blocked by**: Task 6.5 (ConversationPanel), Task 6.12/6.13 (GraphQL data)
- **Blocks**: None
- **Related**: Task 4.7 (Customer detail — similar profile card), Task 8.7 (Shared documents), Task 1.15 (Drawer component)
