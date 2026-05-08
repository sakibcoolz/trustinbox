'use client';

import { Bot as BotIcon } from 'lucide-react';
import type { Bot } from '@/lib/types';
import { AGENT_TYPE_LABELS, getBotStatusVariant } from '@/lib/types';
import { Card } from '@/components/ui/Card';

interface AgentSuiteGraphProps {
  manager: Bot;
  subAgents: Bot[];
}

/**
 * Visualizes a manager bot at the top with sub-agents fanned out below,
 * connected by simple SVG lines.
 */
export function AgentSuiteGraph({ manager, subAgents }: AgentSuiteGraphProps) {
  if (subAgents.length === 0) {
    return (
      <div className="space-y-4">
        <BotCard bot={manager} role="Manager" />
        <p className="text-sm text-text-muted text-center py-4">
          No sub-agents yet. Create specialist bots and assign this manager to enable delegation.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="max-w-sm w-full">
          <BotCard bot={manager} role="Manager" highlight />
        </div>
      </div>
      <div className="flex justify-center">
        <svg viewBox="0 0 100 24" className="w-full max-w-3xl h-6">
          {subAgents.map((_, i) => {
            const x = ((i + 0.5) / subAgents.length) * 100;
            return (
              <line
                key={i}
                x1={50}
                y1={0}
                x2={x}
                y2={24}
                stroke="currentColor"
                className="text-border-secondary"
                strokeWidth={0.4}
              />
            );
          })}
        </svg>
      </div>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(subAgents.length, 4)}, minmax(0, 1fr))` }}
      >
        {subAgents.map((sub) => (
          <BotCard key={sub.id} bot={sub} role="Sub-agent" />
        ))}
      </div>
    </div>
  );
}

function BotCard({ bot, role, highlight }: { bot: Bot; role: string; highlight?: boolean }) {
  const sv = getBotStatusVariant(bot.status);
  return (
    <Card variant={highlight ? 'elevated' : 'default'} padding="sm">
      <div className="flex items-start justify-between gap-2">
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
      <div className="flex items-center justify-between mt-3 text-[10px] text-text-muted">
        <span>{role}</span>
        <span>{bot.totalInteractions.toLocaleString()} runs</span>
      </div>
    </Card>
  );
}
