import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { fetchBot, fetchAgentSuite, fetchActionLogs } from '@/lib/data/ai';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AGENT_TYPE_LABELS, getBotStatusVariant } from '@/lib/types';
import { AgentSuiteGraph } from '@/components/ai/AgentSuiteGraph';
import { HighlightRedacted, RedactionBadge, detectRedactedTypes } from '@/components/ai/RedactionBadge';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BotDetailPage({ params }: PageProps) {
  const { id } = await params;
  const bot = await fetchBot(id);
  if (!bot) notFound();

  const isManager = bot.agentType === 'MANAGER';
  const [suite, audit] = await Promise.all([
    isManager ? fetchAgentSuite(bot.id) : Promise.resolve([]),
    fetchActionLogs({ botId: bot.id, limit: 10 }),
  ]);

  const sv = getBotStatusVariant(bot.status);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link
        href="/ai/bots"
        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={12} /> All bots
      </Link>

      <header className="flex items-start justify-between gap-4 pb-4 border-b border-border-primary">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-text-primary truncate">{bot.name}</h2>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sv.className}`}>
              {sv.label}
            </span>
          </div>
          {bot.description && (
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">{bot.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted">
            <span>{AGENT_TYPE_LABELS[bot.agentType]}</span>
            <span>·</span>
            <span className="font-mono">{bot.provider} / {bot.model}</span>
            <span>·</span>
            <span className="font-mono">{bot.id}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KPICard label="Interactions" value={bot.totalInteractions.toLocaleString()} />
        <KPICard label="Last active" value={bot.lastActiveAt ? new Date(bot.lastActiveAt).toLocaleString() : '—'} />
        <KPICard label="Recent actions" value={String(audit.total)} />
      </div>

      {isManager && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-primary mb-1">Agent suite</h3>
          <p className="text-xs text-text-muted mb-4">
            This manager bot delegates to {suite.length} sub-agent{suite.length === 1 ? '' : 's'}.
          </p>
          <AgentSuiteGraph manager={bot} subAgents={suite} />
        </Card>
      )}

      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Recent actions</h3>
            <p className="text-xs text-text-muted">Most recent {audit.logs.length} of {audit.total} executions for this bot.</p>
          </div>
          <Link
            href={`/ai/audit?botId=${encodeURIComponent(bot.id)}`}
            className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
          >
            All actions <ExternalLink size={12} />
          </Link>
        </div>
        <div className="space-y-2">
          {audit.logs.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">No actions recorded yet.</p>
          ) : (
            audit.logs.map((log) => {
              const redactedTypes = detectRedactedTypes(log.inputSummary);
              return (
                <Card key={log.id} padding="sm" variant="outlined">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-primary">{log.toolUsed}</span>
                      <Badge variant={log.policyDecision === 'ALLOW' ? 'success' : 'error'}>
                        {log.policyDecision}
                      </Badge>
                      <Badge variant={log.success ? 'success' : 'error'}>
                        {log.success ? 'OK' : 'Failed'}
                      </Badge>
                      {redactedTypes.length > 0 && <RedactionBadge types={redactedTypes} />}
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {new Date(log.createdAt).toLocaleTimeString()} · {log.durationMs}ms
                    </span>
                  </div>
                  <HighlightRedacted text={log.inputSummary} />
                </Card>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function KPICard({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="md">
      <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className="text-lg font-semibold text-text-primary mt-1">{value}</p>
    </Card>
  );
}
