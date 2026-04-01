# Task 10.16 — Bot Action Audit Log

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P2 — Audit & compliance  
> **Estimated Scope**: Medium  
> **Route**: `/bots/[id]/analytics`  
> **File**: `apps/provider/src/app/bots/[id]/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add an action audit log section to the analytics page that shows detailed action history with policy decisions, tool usage, input/output summaries, and error details. This complements the activity log on the detail page (task 10.8) with a more audit-focused view.

---

## Current State

No audit log section exists on the analytics page. The page only shows mock KPI cards, daily stats, topics, and escalation reasons.

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

query {
  botActionLogs(botId: ID!, serviceProviderId: ID!, conversationId: ID, limit: Int, offset: Int): BotActionLogConnection!
}
```

---

## Requirements

### 1. Audit Table

| Column | Source | Notes |
|--------|--------|-------|
| **Timestamp** | `log.createdAt` | Full datetime format |
| **Action Type** | `log.actionType` | Badge |
| **Tool** | `log.toolUsed` | Monospace |
| **User** | `log.userId` | User ID or "System" |
| **Input** | `log.inputSummary` | Truncated, expandable |
| **Output** | `log.outputSummary` | Truncated, expandable |
| **Policy** | `log.policyDecision` | ALLOWED/DENIED badge |
| **Duration** | `log.durationMs` | "Xms" |
| **Result** | `log.success` + `errorMessage` | Success/Failed with error |

### 2. Expandable Rows

- Click to expand showing full input/output summaries
- JSON rendering for inputSummary/outputSummary if parseable
- Error details shown in expanded view for failed actions

### 3. Filters

- **Date range**: Last 24h, 7 days, 30 days
- **Action type**: Dropdown filter
- **Result**: All, Success only, Failed only
- **Policy**: All, Allowed, Denied

### 4. Export (future)

- Placeholder download CSV button for compliance exports

---

## Implementation Plan

```tsx
function AuditLog({ botId }: { botId: string }) {
  const { serviceProviderId } = useServiceProvider();
  const [filters, setFilters] = useState({ limit: 50, offset: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading } = useQuery(GET_BOT_ACTION_LOGS, {
    variables: { botId, serviceProviderId, ...filters },
  });

  const logs = data?.botActionLogs?.nodes ?? [];

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Action Audit Log</h3>
        <div className="flex gap-2">
          {/* Filter controls */}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-text-muted border-b border-border-primary">
              <th className="text-left py-2 px-2">Time</th>
              <th className="text-left py-2 px-2">Action</th>
              <th className="text-left py-2 px-2">Tool</th>
              <th className="text-left py-2 px-2">Policy</th>
              <th className="text-left py-2 px-2">Duration</th>
              <th className="text-left py-2 px-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <>
                <tr key={log.id}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="border-b border-border-primary cursor-pointer hover:bg-bg-hover/50">
                  <td className="py-2 px-2 text-xs">{formatDateTime(log.createdAt)}</td>
                  <td className="py-2 px-2 text-xs">{log.actionType}</td>
                  <td className="py-2 px-2 text-xs font-mono">{log.toolUsed || '—'}</td>
                  <td className="py-2 px-2">
                    <PolicyBadge decision={log.policyDecision} />
                  </td>
                  <td className="py-2 px-2 text-xs">{log.durationMs}ms</td>
                  <td className="py-2 px-2">
                    {log.success ? <span className="text-status-success">✓</span> : <span className="text-status-error">✗</span>}
                  </td>
                </tr>
                {expandedId === log.id && (
                  <tr key={`${log.id}-expanded`}>
                    <td colSpan={6} className="p-4 bg-bg-tertiary">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-text-muted mb-1">Input</p>
                          <pre className="text-text-secondary whitespace-pre-wrap">{log.inputSummary || '—'}</pre>
                        </div>
                        <div>
                          <p className="text-text-muted mb-1">Output</p>
                          <pre className="text-text-secondary whitespace-pre-wrap">{log.outputSummary || '—'}</pre>
                        </div>
                        {log.errorMessage && (
                          <div className="col-span-2">
                            <p className="text-status-error mb-1">Error</p>
                            <pre className="text-status-error/80 whitespace-pre-wrap">{log.errorMessage}</pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/analytics/page.tsx` | **Modify** | Add audit log section below KPIs |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add GET_BOT_ACTION_LOGS query (task 10.22) |

---

## Acceptance Criteria

- [ ] Audit log table shows on analytics page below KPI cards
- [ ] Each row shows timestamp, action type, tool, policy decision, duration, result
- [ ] Rows are expandable to show full input/output summaries
- [ ] Failed actions show error message in expanded view
- [ ] Policy decision badges (ALLOWED green, DENIED red)
- [ ] Pagination with load more
- [ ] Loading and empty states
- [ ] Filters for action type and result

---

## Dependencies

- **Blocked by**: Task 10.15 (analytics page with real data), Task 10.22 (botActionLogs query)
- **Blocks**: None
- **Related**: Task 10.8 (activity log on detail page — similar, less detailed)
