'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Save, Send, Eye, FileText, Tag, Type, Globe,
} from 'lucide-react';
import Link from 'next/link';
import { cms, type ContentItem, type ContentType, type ContentStatus, ApiError } from '@/lib/api';
import { useCMSPermissions } from '@/hooks/useAuth';

const TYPES: { value: ContentType; label: string }[] = [
  { value: 'PAGE', label: 'Page' },
  { value: 'ARTICLE', label: 'Article' },
  { value: 'ANNOUNCEMENT', label: 'Announcement' },
  { value: 'FAQ', label: 'FAQ' },
  { value: 'POLICY', label: 'Policy' },
];

export default function CMSEditorPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-text-muted">Loading…</div>}>
      <CMSEditorPage />
    </Suspense>
  );
}

function CMSEditorPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const { permissions, loading: authLoading } = useCMSPermissions();

  const [form, setForm] = useState({
    title: '',
    slug: '',
    type: 'ARTICLE' as ContentType,
    body: '',
    excerpt: '',
    tags: '',
  });
  const [status, setStatus] = useState<ContentStatus>('DRAFT');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(false);

  const loadContent = useCallback(async () => {
    if (!editId) return;
    setLoading(true);
    try {
      const item = await cms.getContent(editId);
      setForm({
        title: item.title,
        slug: item.slug,
        type: item.type,
        body: item.body,
        excerpt: item.excerpt || '',
        tags: (item.tags || []).join(', '),
      });
      setStatus(item.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [editId]);

  useEffect(() => { loadContent(); }, [loadContent]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  }

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  }

  async function handleSave(publishAfter = false) {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.slug.trim()) { setError('Slug is required'); return; }
    if (!form.body.trim()) { setError('Body content is required'); return; }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: Partial<ContentItem> = {
        title: form.title,
        slug: form.slug,
        type: form.type,
        body: form.body,
        excerpt: form.excerpt,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };

      let saved: ContentItem;
      if (editId) {
        saved = await cms.updateContent(editId, payload);
      } else {
        saved = await cms.createContent(payload);
      }

      if (publishAfter && permissions.publish) {
        await cms.publishContent(saved.id);
        setStatus('PUBLISHED');
        setSuccess('Content published successfully');
      } else {
        setStatus(saved.status);
        setSuccess(editId ? 'Content updated' : 'Draft saved');
      }

      if (!editId) {
        window.history.replaceState(null, '', `/cms/editor?id=${saved.id}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <div className="p-8 text-text-muted">Loading…</div>;
  }

  if (!permissions.create && !editId) {
    return (
      <div className="p-8">
        <p className="text-status-error">You do not have permission to create content.</p>
        <Link href="/cms" className="text-accent-blue text-sm hover:underline mt-2 inline-block">Back to CMS</Link>
      </div>
    );
  }

  if (editId && !permissions.edit) {
    // Read-only view
    return (
      <div className="p-8 max-w-4xl">
        <Link href="/cms" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-6">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-2xl font-semibold mb-2">{form.title}</h1>
        <span className="text-xs text-text-muted">Read-only — your role does not allow editing.</span>
        <div className="mt-6 bg-bg-card border border-border-primary rounded-xl p-6 prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-sm text-text-secondary">{form.body}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/cms" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
          <ArrowLeft size={14} /> Back to CMS
        </Link>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            status === 'PUBLISHED' ? 'bg-status-success/10 text-status-success' :
            status === 'IN_REVIEW' ? 'bg-status-warning/10 text-status-warning' :
            'bg-border-secondary text-text-muted'
          }`}>{status}</span>
          <button onClick={() => setPreview(!preview)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-secondary rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors">
            <Eye size={12} /> {preview ? 'Edit' : 'Preview'}
          </button>
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Draft'}
          </button>
          {permissions.publish && (
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
              <Send size={14} /> Publish
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">{error}</div>
      )}
      {success && (
        <div className="mb-4 px-4 py-2 bg-status-success/10 border border-status-success/20 rounded-lg text-sm text-status-success">{success}</div>
      )}

      {preview ? (
        /* ─── Preview ─── */
        <div className="bg-bg-card border border-border-primary rounded-xl p-8">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-2">{form.type} — Preview</p>
          <h1 className="text-2xl font-semibold mb-2">{form.title || 'Untitled'}</h1>
          {form.excerpt && <p className="text-sm text-text-secondary mb-4 italic">{form.excerpt}</p>}
          <div className="border-t border-border-primary pt-4">
            <div className="whitespace-pre-wrap text-sm text-text-secondary leading-relaxed">{form.body}</div>
          </div>
          {form.tags && (
            <div className="flex gap-2 mt-6">
              {form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-border-secondary rounded text-xs text-text-muted">{tag}</span>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── Editor ─── */
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Title */}
            <div className="col-span-2">
              <label className="block text-xs text-text-muted mb-1.5">Title *</label>
              <div className="relative">
                <Type size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="text" value={form.title}
                  onChange={(e) => { update('title', e.target.value); if (!editId) update('slug', autoSlug(e.target.value)); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="Content title" />
              </div>
            </div>
            {/* Type */}
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => update('type', e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Slug *</label>
            <div className="relative">
              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" value={form.slug} onChange={(e) => update('slug', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="content-url-slug" />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Excerpt</label>
            <textarea value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} rows={2}
              className="w-full px-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
              placeholder="Brief summary (optional)" />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Body *</label>
            <textarea value={form.body} onChange={(e) => update('body', e.target.value)} rows={18}
              className="w-full px-4 py-3 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-active resize-y leading-relaxed"
              placeholder="Write your content here…" />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Tags (comma-separated)</label>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" value={form.tags} onChange={(e) => update('tags', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="policy, compliance, update" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
