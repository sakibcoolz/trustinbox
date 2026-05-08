'use client';

import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import type { BotActionLog, AgentDelegationLog, Bot } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ActionLogDrawer } from '@/components/ai/ActionLogDrawer';
import { RedactionBadge, detectRedactedTypes } from '@/components/ai/RedactionBadge';

interface AuditTableProps {
  logs: BotActionLog[];
  total: number;
  bots: Bot[];
  /** Server action used by the drawer to load the thread context. */
  loadThread: (
    threadId: string,
  ) => Promise<{ siblings: BotActionLog[]; delegations: AgentDelegationLog[] }>;
  jaegerUrl?: string;
}

export function AuditTable({ logs, total, bots, loadThread, jaegerUrl }: AuditTableProps) {
  const [selected, setSelected] = useState<BotActionLog | null>(null);
  const [thread, setThread] = useState<{ siblings: BotActionLog[]; delegations: AgentDelegationLog[] }>({
    siblings: [],
    delegations: [],
  });

  const botById = useMemo(() => new Map(bots.map((b) => [b.id, b] as const)), [bots]);

  async function open(log: BotActionLog) {
    setSelected(log);
    if (log.threadId) {
      const data = await loadThread(log.threadId);
      setThread(data);
    } else {
      setThread({ siblings: [], delegations: [] });
    }
  }

  if (logs.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <ScrollText size={20} className="text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-secondary">No action logs match these filters.</p>
      </Card>
    );
  }

  return (
    <>
      <Card padding="none" className="overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg-secondary border-b border-border-primary">
            <tr className="text-text-muted text-left">
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Bot</th>
              <th className="px-3 py-2 font-medium">Tool</th>
              <th className="px-3 py-2 font-medium">Policy</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2 font-medium">Duration</th>
              <th className="px-3 py-2 font-medium">Thread</th>
              <th className="px-3 py-2 font-medium">PII</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const bot = botById.get(log.botId);
              const types = detectRedactedTypes(`${log.inputSummary} ${log.outputSummary}`);
              return (
                <tr
                  key={log.id}
                  onClick={() => open(log)}
                  className="border-b border-border-primary last:border-0 hover:bg-bg-hover cursor-pointer"
                >
                  <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-text-primary truncate max-w-[160px]">
                    {bot?.name ?? log.botId}
                  </td>
                  <td className="px-3 py-2 text-text-primary font-mono">{log.toolUsed}</td>
                  <td className="px-3 py-2">
                    <Badge variant={log.policyDecision === 'ALLOW' ? 'success' : 'error'}>
                      {log.policyDecision}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={log.success ? 'success' : 'error'}>
                      {log.success ? 'OK' : 'Failed'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{log.durationMs} ms</td>
                  <td className="px-3 py-2 text-text-muted font-mono text-[10px]">
                    {log.threadId ? log.threadId.slice(-6) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {types.length > 0 ? <RedactionBadge types={types} /> : <span className="text-text-muted">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-3 py-2 text-[10px] text-text-muted border-t border-border-primary bg-bg-secondary">
          Showing {logs.length} of {total} actions
        </div>
      </Card>

      <ActionLogDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        log={selected}
        threadSiblings={thread.siblings}
        delegations={thread.delegations}
        bots={bots}
        jaegerUrl={jaegerUrl}
      />
    </>
  );
}
