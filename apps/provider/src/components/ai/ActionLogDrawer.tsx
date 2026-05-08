'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { BotActionLog, AgentDelegationLog, Bot } from '@/lib/types';
import { getDelegationDepthVariant } from '@/lib/types';
import { HighlightRedacted, RedactionBadge, detectRedactedTypes } from './RedactionBadge';
import { DelegationTimeline } from './DelegationTimeline';
import { cn } from '@/lib/utils';

interface ActionLogDrawerProps {
  open: boolean;
  onClose: () => void;
  log: BotActionLog | null;
  /** Other action logs sharing this thread, sorted by createdAt asc. */
  threadSiblings?: BotActionLog[];
  delegations?: AgentDelegationLog[];
  bots?: Bot[];
  jaegerUrl?: string;
}

export function ActionLogDrawer({
  open,
  onClose,
  log,
  threadSiblings = [],
  delegations = [],
  bots = [],
  jaegerUrl,
}: ActionLogDrawerProps) {
  const [tab, setTab] = useState<'detail' | 'thread' | 'delegation'>('detail');

  useEffect(() => {
    if (open) setTab('detail');
  }, [open, log?.id]);

  if (!log) {
    return <Drawer open={open} onClose={onClose} title="Action log" size="lg">{null}</Drawer>;
  }

  const inputTypes = detectRedactedTypes(log.inputSummary);
  const outputTypes = detectRedactedTypes(log.outputSummary);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`${log.toolUsed} · ${log.actionType}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={log.policyDecision === 'ALLOW' ? 'success' : 'error'}>
            {log.policyDecision}
          </Badge>
          <Badge variant={log.success ? 'success' : 'error'}>
            {log.success ? 'Success' : 'Failed'}
          </Badge>
          <Badge variant="neutral">{log.durationMs} ms</Badge>
          {log.threadId && (
            <Badge variant="info" className="font-mono">
              thread {log.threadId.slice(-6)}
            </Badge>
          )}
          {jaegerUrl && (
            <a
              href={`${jaegerUrl}/search?tags=%7B%22bot_action_log_id%22%3A%22${log.id}%22%7D`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline"
            >
              <ExternalLink size={12} /> Trace
            </a>
          )}
        </div>

        <div className="flex border-b border-border-primary -mx-6 px-6">
          {([
            { id: 'detail' as const, label: 'Detail' },
            { id: 'thread' as const, label: `Thread (${threadSiblings.length})` },
            { id: 'delegation' as const, label: `Delegations (${delegations.length})` },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-accent-blue text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'detail' && (
          <div className="space-y-3">
            <Card padding="sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-text-secondary">Input</p>
                {inputTypes.length > 0 && <RedactionBadge types={inputTypes} />}
              </div>
              <HighlightRedacted text={log.inputSummary} />
            </Card>
            <Card padding="sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-text-secondary">Output</p>
                {outputTypes.length > 0 && <RedactionBadge types={outputTypes} />}
              </div>
              <HighlightRedacted text={log.outputSummary} />
            </Card>
            {log.policyReason && (
              <Card padding="sm">
                <p className="text-xs font-medium text-text-secondary mb-1">Policy reason</p>
                <p className="text-xs text-text-primary">{log.policyReason}</p>
              </Card>
            )}
            {log.errorMessage && (
              <Card padding="sm" className="border-status-error/30">
                <p className="text-xs font-medium text-status-error mb-1">Error</p>
                <p className="text-xs text-text-primary">{log.errorMessage}</p>
              </Card>
            )}
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-text-muted">Bot</dt>
                <dd className="text-text-primary font-mono">{log.botId}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Conversation</dt>
                <dd className="text-text-primary font-mono">{log.conversationId ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-muted">User</dt>
                <dd className="text-text-primary font-mono">{log.userId ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-text-muted">Created</dt>
                <dd className="text-text-primary">{new Date(log.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        )}

        {tab === 'thread' && (
          <div className="space-y-2">
            {threadSiblings.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">
                No other actions in this thread.
              </p>
            ) : (
              threadSiblings.map((s) => (
                <Card
                  key={s.id}
                  padding="sm"
                  variant={s.id === log.id ? 'elevated' : 'default'}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-primary font-medium">{s.toolUsed}</span>
                      <Badge variant={s.policyDecision === 'ALLOW' ? 'success' : 'error'}>
                        {s.policyDecision}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {new Date(s.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-text-muted">Bot {s.botId} · {s.durationMs} ms</p>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'delegation' && (
          <DelegationTimeline delegations={delegations} bots={bots} />
        )}

        {log.threadId && delegations.length > 0 && (
          <div className="pt-2 text-[10px] text-text-muted">
            Max delegation depth in this thread:{' '}
            <span className={getDelegationDepthVariant(
              Math.max(...delegations.map((d) => d.delegationDepth)),
            ).className + ' px-1.5 py-0.5 rounded'}>
              {Math.max(...delegations.map((d) => d.delegationDepth))}
            </span>
          </div>
        )}
      </div>
    </Drawer>
  );
}
