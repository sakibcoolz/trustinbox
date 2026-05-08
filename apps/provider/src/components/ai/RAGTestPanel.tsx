'use client';

import { useState, useTransition } from 'react';
import { Search, Loader2, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { KnowledgeChunk } from '@/lib/types';

interface RAGTestPanelProps {
  botId: string;
  /** Server action that performs the actual fetch with cookies. */
  onQuery: (input: { botId: string; query: string; topK: number }) => Promise<KnowledgeChunk[]>;
}

export function RAGTestPanel({ botId, onQuery }: RAGTestPanelProps) {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState<KnowledgeChunk[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const chunks = await onQuery({ botId, query, topK });
        setResults(chunks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Query failed');
        setResults(null);
      }
    });
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">RAG test</h3>
        <span
          className="inline-flex items-center gap-1 text-[10px] text-status-success"
          title="Service Provider ID is automatically injected by TenantGate; cross-tenant access is impossible."
        >
          <ShieldCheck size={10} /> SP-scoped
        </span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="rag-query" className="block text-[10px] text-text-muted mb-1">
            Query
          </label>
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              id="rag-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything in the knowledge base…"
              className="w-full pl-7 pr-3 py-2 text-sm rounded-lg bg-bg-input border border-border-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="rag-topk" className="text-[10px] text-text-muted">
            Top K: <span className="text-text-primary font-medium">{topK}</span>
          </label>
          <input
            id="rag-topk"
            type="range"
            min={1}
            max={20}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Query
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 text-xs text-status-error">{error}</p>
      )}

      {results && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] text-text-muted">
            {results.length} result{results.length === 1 ? '' : 's'}
          </p>
          {results.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No matches in this bot's knowledge base.</p>
          ) : (
            results.map((c) => (
              <Card key={c.chunkId} variant="outlined" padding="sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-medium text-text-primary truncate">
                    {c.sourceName}
                  </span>
                  <Badge variant={c.relevanceScore >= 0.8 ? 'success' : c.relevanceScore >= 0.6 ? 'warning' : 'neutral'}>
                    {(c.relevanceScore * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary line-clamp-3">{c.content}</p>
              </Card>
            ))
          )}
        </div>
      )}
    </Card>
  );
}
