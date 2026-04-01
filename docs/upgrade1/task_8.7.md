# Task 8.7 — Share Document with Customer

> **Section**: 8. Documents  
> **Priority**: P0 — Core action  
> **Estimated Scope**: Large  
> **Route**: `/documents`  
> **Component**: ShareDocumentModal
> **Status**: ✅ Complete

---

## Objective

Implement document sharing functionality where providers can select customer(s) and share documents via conversation with signed URLs, respecting privacy preferences.

---

## Current State

No document sharing UI exists. Backend proto defines:
```protobuf
rpc ShareDocument(ShareDocumentRequest) returns (ShareDocumentResponse);
rpc ListDocumentShares(ListDocumentSharesRequest) returns (ListDocumentSharesResponse);
```

GraphQL schema has `DocumentShare` type with `shareContext` (NOTIFICATION/CHAT/CALLBACK/DIRECT).

---

## Requirements

### Share Flow

```
1. Click "Share" on document
2. Modal opens with customer search
3. Select customer(s) — multi-select
4. Policy check per customer: allowDocumentShares
5. Select share context: Chat / Direct / Notification
6. Optional message
7. Confirm → ShareDocument mutation
8. Success toast with link to conversation (if chat)
```

### Share Form

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| **Recipients** | Multi-select search | Yes | Search by VID or name |
| **Context** | Dropdown | Yes | Chat, Direct, Notification |
| **Message** | Textarea | No | Optional message to attach |
| **Expiry** | Dropdown | No | 24h, 7d, 30d, Never |

### Policy Check
- Run `allowDocumentShares` check per recipient
- Show green/red indicator per recipient
- Block sharing to recipients who deny document shares
- Show warning if any recipient will be blocked

### Signed URL
- Backend generates signed URL with selected expiry
- URL attached to the share record
- Recipient can open via conversation or direct link

---

## Implementation Plan

```tsx
interface ShareDocumentModalProps {
  documentId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

function ShareDocumentModal({ documentId, fileName, isOpen, onClose }: ShareDocumentModalProps) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [context, setContext] = useState<'CHAT' | 'DIRECT' | 'NOTIFICATION'>('CHAT');
  const [message, setMessage] = useState('');
  const [shareDocument, { loading }] = useShareDocument();

  async function handleShare() {
    for (const recipientId of recipients) {
      await shareDocument({
        variables: {
          input: { documentId, userId: recipientId, shareContext: context, message },
        },
      });
    }
    toast({ title: `Document shared with ${recipients.length} recipient(s)`, variant: 'success' });
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-elevated border border-border-primary rounded-xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Share Document</h2>
        <p className="text-sm text-text-muted">{fileName}</p>
        {/* Recipient search + multi-select */}
        {/* Policy check indicators per recipient */}
        {/* Context dropdown */}
        {/* Message textarea */}
        <button onClick={handleShare} disabled={loading || recipients.length === 0}
          className="w-full py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium disabled:opacity-50">
          Share with {recipients.length} recipient(s)
        </button>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/documents/ShareDocumentModal.tsx` | Create — share modal with recipients |
| `apps/provider/src/app/documents/page.tsx` | Modify — wire Share action |
| `apps/provider/src/lib/graphql/documents.ts` | Modify — add shareDocument mutation |

---

## Acceptance Criteria

- [ ] Share modal with recipient search (multi-select)
- [ ] Policy check per recipient (`allowDocumentShares`)
- [ ] Blocked recipients shown with warning
- [ ] Share context selection (Chat/Direct/Notification)
- [ ] Optional message attachment
- [ ] Success toast with link to conversation
- [ ] Signed URL generated with expiry
- [ ] Requires `documents:share` permission

---

## Dependencies

- **Blocked by**: Task 8.1 (DocumentManager), Task 8.12 (GraphQL), Task 8.13 (signed URLs), Task 4.14 (policy check)
- **Blocks**: None
- **Related**: Task 6.9 (conversation "Share Document" action), Task 6.11 (shared documents sidebar)
