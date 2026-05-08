import { ScrollText } from 'lucide-react';
import { fetchActionLogs, fetchBots, fetchDelegationsForThread } from '@/lib/data/ai';
import { AuditTable } from '@/components/ai/AuditTable';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    botId?: string;
    toolName?: string;
    policyDecision?: string;
    threadId?: string;
    success?: string;
  }>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = {
    botId: sp.botId,
    toolName: sp.toolName,
    policyDecision: sp.policyDecision,
    threadId: sp.threadId,
    success: sp.success === undefined ? undefined : sp.success === 'true',
    limit: 50,
  };
  const [{ logs, total }, bots] = await Promise.all([fetchActionLogs(filters), fetchBots()]);

  async function loadThread(threadId: string) {
    'use server';
    const [{ logs: siblings }, delegations] = await Promise.all([
      fetchActionLogs({ threadId, limit: 100 }),
      fetchDelegationsForThread(threadId),
    ]);
    return { siblings, delegations };
  }

  const jaegerUrl = process.env.NEXT_PUBLIC_JAEGER_URL;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <ScrollText size={18} /> Action audit
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Every bot tool call recorded with policy decision, redacted input/output, and a Jaeger trace link.
          Rows sharing a thread ID belong to the same conversation hop.
        </p>
      </header>

      <ActiveFilters filters={filters} />

      <AuditTable logs={logs} total={total} bots={bots} loadThread={loadThread} jaegerUrl={jaegerUrl} />
    </div>
  );
}

function ActiveFilters({ filters }: { filters: Record<string, unknown> }) {
  const active = Object.entries(filters).filter(
    ([k, v]) => v !== undefined && v !== '' && k !== 'limit',
  );
  if (active.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap text-[10px] text-text-secondary">
      <span className="text-text-muted">Filters:</span>
      {active.map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-card border border-border-primary"
        >
          <span className="text-text-muted">{k}</span>
          <span className="text-text-primary font-mono">{String(v)}</span>
        </span>
      ))}
    </div>
  );
}
