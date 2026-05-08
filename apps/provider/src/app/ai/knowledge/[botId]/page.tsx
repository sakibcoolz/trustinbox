import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { fetchBot, fetchKnowledgeSources, queryKnowledge } from '@/lib/data/ai';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RAGTestPanel } from '@/components/ai/RAGTestPanel';
import { KnowledgeUploader } from '@/components/ai/KnowledgeUploader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ botId: string }>;
}

export default async function BotKnowledgePage({ params }: PageProps) {
  const { botId } = await params;
  const [bot, sources] = await Promise.all([fetchBot(botId), fetchKnowledgeSources({ botId })]);
  if (!bot) notFound();

  async function runQuery(input: { botId: string; query: string; topK: number }) {
    'use server';
    return queryKnowledge(input);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link
        href="/ai/knowledge"
        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={12} /> All knowledge
      </Link>

      <header>
        <h2 className="text-xl font-semibold text-text-primary">{bot.name} · Knowledge</h2>
        <p className="text-xs text-text-muted font-mono mt-1">
          collection: trustinbox_bot_{bot.id}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Sources</h3>
          {sources.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">No sources indexed yet.</p>
          ) : (
            <div className="space-y-2">
              {sources.map((src) => (
                <Card key={src.id} variant="outlined" padding="sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary truncate">{src.name}</span>
                    <Badge variant={src.status === 'READY' ? 'success' : src.status === 'FAILED' ? 'error' : 'warning'}>
                      {src.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span>{src.type}</span>
                    <span>·</span>
                    <span>{src.chunkCount} chunks</span>
                    <span>·</span>
                    <span>{(src.sizeBytes / 1024).toFixed(1)} KB</span>
                    {src.lastIndexedAt && (
                      <>
                        <span>·</span>
                        <span>indexed {new Date(src.lastIndexedAt).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <RAGTestPanel botId={bot.id} onQuery={runQuery} />
          <KnowledgeUploader botId={bot.id} />
        </div>
      </div>
    </div>
  );
}
