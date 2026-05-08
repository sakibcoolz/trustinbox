'use client';

import { Sparkles, RefreshCw, AlertTriangle, Activity } from 'lucide-react';
import Link from 'next/link';
import { useData } from '@/lib/hooks/useData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ConversationAIInsights } from '@/lib/types';

interface AIInsightsPanelProps {
  conversationId: string;
}

export function AIInsightsPanel({ conversationId }: AIInsightsPanelProps) {
  const { data, loading, error, refetch } = useData<ConversationAIInsights>(
    `/api/gateway/v1/ai/conversations/${encodeURIComponent(conversationId)}/insights`,
  );

  return (
    <aside className="w-80 shrink-0 border-l border-border-primary bg-bg-secondary p-4 space-y-3 overflow-y-auto">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Sparkles size={14} className="text-accent-purple" /> AI insights
        </h3>
        <button
          onClick={refetch}
          disabled={loading}
          aria-label="Refresh insights"
          className="p-1 rounded hover:bg-bg-hover text-text-muted hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {error && (
        <Card variant="outlined" padding="sm" className="border-status-error/30">
          <p className="text-xs text-status-error">Failed to load insights</p>
        </Card>
      )}

      {loading && !data && (
        <div className="space-y-2">
          <div className="h-12 rounded-lg bg-bg-card animate-pulse" />
          <div className="h-12 rounded-lg bg-bg-card animate-pulse" />
        </div>
      )}

      {data && (
        <>
          <Card padding="sm">
            <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Summary</p>
            <p className="text-xs text-text-secondary leading-relaxed">{data.summary}</p>
            {data.summaryGeneratedAt && (
              <p className="text-[10px] text-text-muted mt-2">
                generated {new Date(data.summaryGeneratedAt).toLocaleString()}
              </p>
            )}
          </Card>

          {data.detectedCategories.length > 0 && (
            <Card padding="sm">
              <p className="text-[10px] uppercase tracking-wide text-text-muted mb-2">Categories</p>
              <div className="flex flex-wrap gap-1">
                {data.detectedCategories.map((c) => (
                  <Badge key={c} variant="purple">
                    {c}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          <Card padding="sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1">
                <AlertTriangle size={10} /> Spam score
              </span>
              <Badge
                variant={data.spamScore >= 0.7 ? 'error' : data.spamScore >= 0.3 ? 'warning' : 'success'}
              >
                {(data.spamScore * 100).toFixed(0)}%
              </Badge>
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-1">
                <Activity size={10} /> Bot actions
              </span>
              <span className="text-sm font-semibold text-text-primary">{data.botActionCount}</span>
            </div>
            {data.lastBotActionAt && (
              <p className="text-[10px] text-text-muted">
                last {new Date(data.lastBotActionAt).toLocaleTimeString()}
              </p>
            )}
            <Link
              href={`/ai/audit?conversationId=${encodeURIComponent(conversationId)}`}
              className="block mt-2 text-xs text-accent-blue hover:underline"
            >
              View action audit →
            </Link>
          </Card>
        </>
      )}
    </aside>
  );
}
