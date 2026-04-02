'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { ArrowLeft, Database, Plus, FileText, Globe, AlignLeft, HelpCircle, Code, Upload, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import {
  useBotKnowledgeSources,
  useAddKnowledgeSource,
  useRemoveKnowledgeSource,
  getKnowledgeSourceStatusConfig,
  getKnowledgeSourceTypeConfig,
  type KnowledgeSourceType,
  type KnowledgeSource,
} from '@/lib/graphql/bots';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SOURCE_TYPE_ICONS: Record<string, typeof FileText> = {
  DOCUMENT: FileText,
  URL: Globe,
  TEXT: AlignLeft,
  FAQ: HelpCircle,
  API: Code,
};

/* ─── Add Source Form ─── */
function AddSourceForm({ botId, onClose }: { botId: string; onClose: () => void }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const { addSource, loading } = useAddKnowledgeSource();
  const { success, error: toastError } = useToast();

  const [form, setForm] = useState({
    sourceType: 'DOCUMENT' as KnowledgeSourceType,
    name: '',
    description: '',
    content: '',
    file: null as File | null,
  });

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canSubmit(): boolean {
    if (form.name.length < 2) return false;
    if (form.sourceType === 'DOCUMENT' && !form.file) return false;
    if (['TEXT', 'FAQ', 'API', 'URL'].includes(form.sourceType) && !form.content.trim()) return false;
    return true;
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) updateField('file', file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) updateField('file', file);
  }

  async function handleSubmit() {
    try {
      await addSource({
        botId,
        serviceProviderId: spId,
        sourceType: form.sourceType,
        name: form.name,
        description: form.description || undefined,
        content: form.sourceType !== 'DOCUMENT' ? form.content : undefined,
        fileType: form.file?.name.split('.').pop(),
        fileSize: form.file?.size,
      });
      success('Knowledge source added');
      onClose();
    } catch {
      toastError('Failed to add source');
    }
  }

  return (
    <div className="bg-bg-card border border-accent-purple/30 rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Add Knowledge Source</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Source Type *</label>
          <select value={form.sourceType} onChange={(e) => updateField('sourceType', e.target.value as KnowledgeSourceType)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
            <option value="DOCUMENT">Document Upload</option>
            <option value="URL">Web URL</option>
            <option value="TEXT">Plain Text</option>
            <option value="FAQ">FAQ</option>
            <option value="API">API Endpoint</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Name *</label>
          <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Source name" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1.5">Description</label>
        <input type="text" value={form.description} onChange={(e) => updateField('description', e.target.value)}
          className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="Optional description" />
      </div>

      {form.sourceType === 'DOCUMENT' && (
        <div onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop}
          className="border-2 border-dashed border-border-secondary rounded-xl p-8 text-center hover:border-accent-purple/30 transition-colors">
          {form.file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText size={20} className="text-accent-purple" />
              <span className="text-sm text-text-primary">{form.file.name}</span>
              <span className="text-xs text-text-muted">({formatFileSize(form.file.size)})</span>
              <button onClick={() => updateField('file', null)} className="text-xs text-status-error hover:underline ml-2">Remove</button>
            </div>
          ) : (
            <>
              <Upload size={24} className="mx-auto text-text-muted mb-2" />
              <p className="text-sm text-text-muted">
                Drop files here or <label className="text-accent-purple hover:underline cursor-pointer">browse<input type="file" accept=".pdf,.md,.txt,.docx" className="hidden" onChange={handleFileSelect} /></label>
              </p>
              <p className="text-xs text-text-muted mt-1">PDF, TXT, MD, DOCX — Max 10 MB</p>
            </>
          )}
        </div>
      )}

      {form.sourceType === 'URL' && (
        <div>
          <label className="block text-xs text-text-muted mb-1.5">URL *</label>
          <input type="url" value={form.content} onChange={(e) => updateField('content', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="https://example.com/docs" />
        </div>
      )}

      {(form.sourceType === 'TEXT' || form.sourceType === 'FAQ') && (
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Content *</label>
          <textarea value={form.content} onChange={(e) => updateField('content', e.target.value)} rows={6}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
            placeholder={form.sourceType === 'FAQ' ? 'Q: Question\nA: Answer\n\nQ: Question\nA: Answer' : 'Paste text content here…'} />
        </div>
      )}

      {form.sourceType === 'API' && (
        <div>
          <label className="block text-xs text-text-muted mb-1.5">API Endpoint / OpenAPI Spec *</label>
          <textarea value={form.content} onChange={(e) => updateField('content', e.target.value)} rows={4}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
            placeholder='{"openapi": "3.0.0", ...}' />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={loading || !canSubmit()}
          className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50">
          {loading ? 'Adding…' : 'Add Source'}
        </button>
      </div>
    </div>
  );
}

/* ─── Remove Source Button ─── */
function RemoveSourceButton({ source, botId }: { source: KnowledgeSource; botId: string }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const { removeSource, loading } = useRemoveKnowledgeSource();
  const { success, error: toastError } = useToast();
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleRemove() {
    try {
      await removeSource(source.id, botId, spId);
      success('Knowledge source removed');
      setShowConfirm(false);
    } catch {
      toastError('Failed to remove source');
    }
  }

  return (
    <>
      <button onClick={() => setShowConfirm(true)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error" title="Remove">
        <Trash2 size={14} />
      </button>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-surface border border-border-primary rounded-xl p-6 w-[400px] space-y-4">
            <h3 className="text-sm font-semibold text-status-error">Remove &quot;{source.name}&quot;?</h3>
            <p className="text-sm text-text-secondary">This will delete all indexed chunks and the bot will lose access to this knowledge source.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={handleRemove} disabled={loading}
                className="px-4 py-2 bg-status-error text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {loading ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Main Page ─── */
function KnowledgeContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const [showAdd, setShowAdd] = useState(false);

  const { data, loading, error, refetch } = useBotKnowledgeSources(id, spId);
  const sources: KnowledgeSource[] = data?.botKnowledgeSources ?? [];

  const hasProcessing = sources.some((s) => s.status === 'PENDING' || s.status === 'PROCESSING');

  useEffect(() => {
    if (!hasProcessing) return;
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [hasProcessing, refetch]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-bg-tertiary rounded-xl animate-pulse" />)}</div>
        <div className="h-64 bg-bg-tertiary rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-status-error">{error.message}</p>
        <Link href={`/bots/${id}`} className="text-accent-purple text-sm hover:underline mt-2 inline-block">Back to bot</Link>
      </div>
    );
  }

  const indexed = sources.filter((s) => s.status === 'ACTIVE_SOURCE').length;
  const totalChunks = sources.reduce((acc, s) => acc + (s.chunkCount ?? 0), 0);
  const totalSize = sources.reduce((acc, s) => acc + (s.fileSize ?? 0), 0);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/bots/${id}`} className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Knowledge Sources</h1>
            <p className="text-text-secondary text-sm mt-0.5">Manage knowledge base for this bot</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors">
          <Plus size={16} /> Add Source
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Sources', value: String(sources.length) },
          { label: 'Indexed', value: String(indexed) },
          { label: 'Total Chunks', value: totalChunks.toLocaleString() },
          { label: 'Total Size', value: totalSize > 0 ? formatFileSize(totalSize) : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-lg font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add Source Form */}
      {showAdd && <AddSourceForm botId={id} onClose={() => setShowAdd(false)} />}

      {/* Sources Table */}
      {sources.length === 0 ? (
        <div className="text-center py-16">
          <Database size={40} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-muted">No knowledge sources yet</p>
          <p className="text-xs text-text-muted mt-1">Add documents, URLs, or text to teach your bot</p>
        </div>
      ) : (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-xs text-text-muted">
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Size</th>
                <th className="px-4 py-3 text-left font-medium">Chunks</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Added</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => {
                const Icon = SOURCE_TYPE_ICONS[s.sourceType] ?? FileText;
                const statusCfg = getKnowledgeSourceStatusConfig(s.status);
                const typeCfg = getKnowledgeSourceTypeConfig(s.sourceType);
                return (
                  <tr key={s.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className="text-text-muted shrink-0" />
                        <div>
                          <span className="font-medium">{s.name}</span>
                          {s.description && <p className="text-xs text-text-muted truncate max-w-[200px]">{s.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{typeCfg.label}</td>
                    <td className="px-4 py-3 text-text-muted text-xs">{s.fileSize ? formatFileSize(s.fileSize) : '—'}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{s.chunkCount ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}>
                        {s.status === 'PROCESSING' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{formatRelativeTime(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {s.status === 'FAILED' && (
                          <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-warning" title="Retry">
                            <RefreshCw size={14} />
                          </button>
                        )}
                        <RemoveSourceButton source={s} botId={id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BotKnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-bg-tertiary rounded-xl animate-pulse" />)}</div>
        <div className="h-64 bg-bg-tertiary rounded-xl animate-pulse" />
      </div>
    }>
      <KnowledgeContent params={params} />
    </Suspense>
  );
}
