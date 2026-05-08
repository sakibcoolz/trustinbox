import Link from 'next/link';
import { Bot as BotIcon, Plus, Network } from 'lucide-react';
import { fetchBots } from '@/lib/data/ai';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AGENT_TYPE_LABELS, getBotStatusVariant } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AIBotsPage() {
  const bots = await fetchBots();
  const managers = bots.filter((b) => b.agentType === 'MANAGER');
  const subAgents = bots.filter((b) => b.agentType !== 'MANAGER');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Bots</h2>
          <p className="text-sm text-text-secondary mt-1">
            Configure AI agents that triage conversations, schedule callbacks, and execute tools — all gated by the policy engine.
          </p>
        </div>
        <Link
          href="/ai/bots/new"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90 transition-colors"
        >
          <Plus size={14} /> New bot
        </Link>
      </div>

      {bots.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Section title="Managers" description="Top-level agents that route incoming intents to specialists." bots={managers} />
          <Section title="Sub-agents" description="Specialists invoked by a manager via delegation." bots={subAgents} />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  bots,
}: {
  title: string;
  description: string;
  bots: Awaited<ReturnType<typeof fetchBots>>;
}) {
  if (bots.length === 0) return null;
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {bots.map((bot) => {
          const sv = getBotStatusVariant(bot.status);
          return (
            <Link key={bot.id} href={`/ai/bots/${bot.id}`}>
              <Card variant="interactive" padding="md" className="h-full">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-accent-purple/10 text-accent-purple flex items-center justify-center shrink-0">
                      <BotIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{bot.name}</p>
                      <p className="text-[10px] text-text-muted">{AGENT_TYPE_LABELS[bot.agentType]}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sv.className}`}>
                    {sv.label}
                  </span>
                </div>
                {bot.description && (
                  <p className="text-xs text-text-secondary line-clamp-2 mb-3">{bot.description}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>{bot.totalInteractions.toLocaleString()} interactions</span>
                  <Badge variant="neutral">{bot.provider} · {bot.model}</Badge>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <Card padding="lg" className="text-center">
      <div className="w-12 h-12 rounded-full bg-accent-purple/10 text-accent-purple flex items-center justify-center mx-auto mb-3">
        <Network size={20} />
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">No bots yet</h3>
      <p className="text-xs text-text-secondary mb-4 max-w-md mx-auto">
        Start with a Manager bot to route conversations, then add specialist sub-agents like Customer Service or Appointment Scheduling.
      </p>
      <Link
        href="/ai/bots/new"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90"
      >
        <Plus size={14} /> Create your first bot
      </Link>
    </Card>
  );
}
