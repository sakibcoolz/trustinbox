import Link from 'next/link';
import { Library, Database } from 'lucide-react';
import { fetchKnowledgeSources, fetchBots } from '@/lib/data/ai';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const [sources, bots] = await Promise.all([fetchKnowledgeSources(), fetchBots()]);

  // Group by botId.
  const byBot = new Map<string, typeof sources>();
  for (const src of sources) {
    const list = byBot.get(src.botId) ?? [];
    list.push(src);
    byBot.set(src.botId, list);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <Library size={18} /> Knowledge
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Documents indexed into bot-scoped vector collections. Each bot's knowledge is isolated by service provider via TenantGate.
        </p>
      </header>

      {bots.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Database size={20} className="text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Create a bot first to attach knowledge sources.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {bots.map((bot) => {
            const list = byBot.get(bot.id) ?? [];
            return (
              <Card key={bot.id} padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{bot.name}</h3>
                    <p className="text-[10px] text-text-muted font-mono">
                      collection: trustinbox_bot_{bot.id}
                    </p>
                  </div>
                  <Link
                    href={`/ai/knowledge/${bot.id}`}
                    className="text-xs text-accent-blue hover:underline"
                  >
                    Manage →
                  </Link>
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-text-muted py-3">No sources indexed.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {list.map((src) => (
                      <Card key={src.id} variant="outlined" padding="sm">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-text-primary truncate">
                            {src.name}
                          </span>
                          <StatusBadgeForSource status={src.status} />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          <span>{src.type}</span>
                          <span>·</span>
                          <span>{src.chunkCount} chunks</span>
                          <span>·</span>
                          <span>{(src.sizeBytes / 1024).toFixed(1)} KB</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadgeForSource({ status }: { status: 'INDEXING' | 'READY' | 'FAILED' }) {
  const variant = status === 'READY' ? 'success' : status === 'FAILED' ? 'error' : 'warning';
  return <Badge variant={variant}>{status}</Badge>;
}
