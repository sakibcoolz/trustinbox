# Task 10.8 — Bot Activity Log

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — Detail page  
> **Estimated Scope**: Medium  
> **Route**: `/bots/[id]`  
> **File**: `apps/provider/src/app/bots/[id]/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add an activity log section/tab to the bot detail page showing recent bot interactions with action type, tool used, policy decision, duration, success/failure status, and links to related conversations.

---

## Current State

No activity log exists. The detail page only shows stats and configuration.

### GraphQL Schema

```graphql
type BotActionLog {
  id: ID!
  botId: ID!
  conversationId: ID
  userId: ID
  actionType: String!
  toolUsed: String
  inputSummary: String
  outputSummary: String
  policyDecision: String
  durationMs: Int
  success: Boolean!
  errorMessage: String
  createdAt: DateTime!
}

type BotActionLogConnection { nodes: [BotActionLog!]!, totalCount: Int! }

query {
  botActionLogs(botId: ID!, serviceProviderId: ID!, conversationId: ID, limit: Int, offset: Int): BotActionLogConnection!
}
```

---

## Requirements

### 1. Activity Log Table

| Column | Source | Notes |
|--------|--------|-------|
| **Time** | `log.createdAt` | Relative time |
| **Action** | `log.actionType` | Badge with icon |
| **Tool** | `log.toolUsed` | Monospace text or "—" |
| **Conversation** | `log.conversationId` | Link to `/conversations/[id]` |
| **Policy** | `log.policyDecision` | ALLOWED (green) / DENIED (red) / null (gray) |
| **Duration** | `log.durationMs` | "Xms" format |
| **Result** | `log.success` | ✅ or ❌ |
| **Error** | `log.errorMessage` | Shown on hover/expand if failed |

### 2. Pagination

- Page size: 25
- Load more or offset pagination
- Total count shown

### 3. Filters (optional)

- Filter by actionType
- Filter by success/failure
- Filter by conversationId

### 4. Real-time Updates

- Subscribe to `providerBotActionExecuted(serviceProviderId)` for live action feed (task 10.23)
- New entries prepend to the top of the log

---

## Implementation Plan

```tsx
function BotActivityLog({ botId }: { botId: string }) {
  const { serviceProviderId } = useServiceProvider();
  const [page, setPage] = useState(0);

  const { data, loading } = useQuery(GET_BOT_ACTION_LOGS, {
    variables: { botId, serviceProviderId, limit: 25, offset: page * 25 },
  });

  const logs = data?.botActionLogs?.nodes ?? [];
  const totalCount = data?.botActionLogs?.totalCount ?? 0;

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Activity Log ({totalCount})</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-text-muted border-b border-border-primary">
            <th className="text-left py-2 px-3">Time</th>
            <th className="text-left py-2 px-3">Action</th>
            <th className="text-left py-2 px-3">Tool</th>
            <th className="text-left py-2 px-3">Policy</th>
            <th className="text-left py-2 px-3">Duration</th>
            <th className="text-left py-2 px-3">Result</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover/50">
              <td className="py-2 px-3 text-xs text-text-muted">{formatRelativeTime(log.createdAt)}</td>
              <td className="py-2 px-3 text-xs">{log.actionType}</td>
              <td className="py-2 px-3 text-xs font-mono text-text-secondary">{log.toolUsed || '—'}</td>
              <td className="py-2 px-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  log.policyDecision === 'ALLOWED' ? 'bg-status-success/10 text-status-success' :
                  log.policyDecision === 'DENIED' ? 'bg-status-error/10 text-status-error' :
                  'bg-border-secondary text-text-muted'
                }`}>{log.policyDecision || '—'}</span>
              </td>
              <td className="py-2 px-3 text-xs text-text-muted">{log.durationMs ? `${log.durationMs}ms` : '—'}</td>
              <td className="py-2 px-3">{log.success ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/page.tsx` | **Modify** | Add Activity Log as tab or section |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add GET_BOT_ACTION_LOGS query |

---

## Acceptance Criteria

- [ ] Activity log table shows recent bot actions
- [ ] Each row: time, action type, tool used, policy decision, duration, result
- [ ] Conversation ID links to conversation page
- [ ] Failed actions show error message on hover/expand
- [ ] Pagination with 25 items per page
- [ ] Loading state shows skeleton rows
- [ ] Empty state: "No activity recorded yet"

---

## Dependencies

- **Blocked by**: Task 10.7 (bot detail page with real data), Task 10.22 (botActionLogs query)
- **Blocks**: None
- **Related**: Task 10.16 (action audit log on analytics page — similar data), Task 10.23 (subscription for live updates)
