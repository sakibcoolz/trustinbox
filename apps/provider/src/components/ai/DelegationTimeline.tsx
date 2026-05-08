'use client';

import { ArrowDown } from 'lucide-react';
import type { AgentDelegationLog, Bot } from '@/lib/types';
import { AGENT_TYPE_LABELS, getDelegationDepthVariant } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { HighlightRedacted } from './RedactionBadge';

interface DelegationTimelineProps {
  delegations: AgentDelegationLog[];
  bots?: Bot[];
}

/**
 * Visualizes a chain of delegations within a single thread.
 * Each hop shows manager → target with depth badge and intent.
 */
export function DelegationTimeline({ delegations, bots = [] }: DelegationTimelineProps) {
  if (delegations.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-8">
        No agent delegations recorded for this thread.
      </p>
    );
  }

  const sorted = [...delegations].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  function botName(id: string): string {
    const bot = bots.find((b) => b.id === id);
    if (bot) return `${bot.name} (${AGENT_TYPE_LABELS[bot.agentType]})`;
    return id;
  }

  return (
    <div className="space-y-2">
      {sorted.map((d, i) => {
        const depthVariant = getDelegationDepthVariant(d.delegationDepth);
        const isMaxDepth = d.delegationDepth >= 3;
        return (
          <div key={d.id}>
            <Card padding="sm" variant={isMaxDepth ? 'outlined' : 'default'}
              className={cn(isMaxDepth && 'border-status-error/30')}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="font-medium text-text-primary">{botName(d.managerBotId)}</span>
                  <span className="text-text-muted">→</span>
                  <span className="font-medium text-text-primary">{botName(d.targetBotId)}</span>
                </div>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', depthVariant.className)}>
                  {depthVariant.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-text-muted mb-0.5">Intent</p>
                  <p className="text-text-primary">{d.intentDetected ?? '—'}</p>
                  <p className="text-text-muted text-[10px] mt-0.5">
                    Confidence {(d.confidenceScore * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-text-muted mb-0.5">Duration</p>
                  <p className="text-text-primary">{d.durationMs} ms</p>
                  {!d.success && (
                    <p className="text-status-error text-[10px] mt-0.5">{d.errorMessage ?? 'failed'}</p>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border-primary">
                <p className="text-[10px] text-text-muted mb-1">Input (redacted)</p>
                <HighlightRedacted text={d.inputSummary} />
              </div>
            </Card>
            {i < sorted.length - 1 && (
              <div className="flex justify-center py-1 text-text-muted">
                <ArrowDown size={14} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
