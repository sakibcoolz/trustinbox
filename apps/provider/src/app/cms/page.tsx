'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Filter, FileText, Eye, Pencil, Trash2,
  Send, Archive, MoreHorizontal, ChevronDown,
} from 'lucide-react';
import { cms, type ContentItem, type ContentStatus, type ContentType, ApiError } from '@/lib/api';
import { useCMSPermissions } from '@/hooks/useAuth';

const STATUS_COLORS: Record<ContentStatus, string> = {
  DRAFT: 'bg-border-secondary text-text-muted',
  IN_REVIEW: 'bg-status-warning/10 text-status-warning',
  PUBLISHED: 'bg-status-success/10 text-status-success',
  ARCHIVED: 'bg-accent-purple/10 text-accent-purple',
};

const TYPE_LABELS: Record<ContentType, string> = {
  PAGE: 'Page',
  ARTICLE: 'Article',
  ANNOUNCEMENT: 'Announcement',
  FAQ: 'FAQ',
  POLICY: 'Policy',
};

const STATUSES: ContentStatus[] = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'];
const TYPES: ContentType[] = ['PAGE', 'ARTICLE', 'ANNOUNCEMENT', 'FAQ', 'POLICY'];

export default function CMSContentPage() {
  const { permissions, loading: authLoading } = useCMSPermissions();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContentStatus | ''>('');
  const [filterType, setFilterType] = useState<ContentType | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Action menu
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await cms.listContent({
        status: filterStatus || undefined,
        type: filterType || undefined,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  async function handlePublish(id: string) {
    try {
      await cms.publishContent(id);
      fetchContent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Publish failed');
    }
    setActionMenu(null);
  }

  async function handleArchive(id: string) {
    try {
      await cms.archiveContent(id);
      fetchContent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Archive failed');
    }
    setActionMenu(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this content?')) return;
    try {
      await cms.deleteContent(id);
      fetchContent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
    setActionMenu(null);
  }

  const filtered = items.filter((item) =>
    !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
    return <div className="p-8 text-text-muted">Loading…</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Content Management</h1>
          <p className="text-text-secondary text-sm mt-1">{total} total items</p>
        </div>
        {permissions.create && (
          <Link href="/cms/editor"
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
            <Plus size={16} /> New Content
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">{error}</div>
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content…"
            className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
            showFilters ? 'border-accent-blue text-accent-blue' : 'border-border-secondary text-text-secondary hover:text-text-primary'
          }`}>
          <Filter size={14} /> Filters <ChevronDown size={12} className={showFilters ? 'rotate-180' : ''} />
        </button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-bg-secondary border border-border-primary rounded-lg">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ContentStatus | '')}
              className="px-3 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-xs text-text-primary focus:outline-none focus:border-border-active">
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-muted mb-1">Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as ContentType | '')}
              className="px-3 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-xs text-text-primary focus:outline-none focus:border-border-active">
              <option value="">All</option>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilterStatus(''); setFilterType(''); }}
            className="text-xs text-text-muted hover:text-text-primary mt-4">Clear</button>
        </div>
      )}

      {/* Content table */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary">
              <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Title</th>
              <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Type</th>
              <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Author</th>
              <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Updated</th>
              <th className="text-right px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                {items.length === 0 ? 'No content yet. Create your first piece.' : 'No results match your search.'}
              </td></tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-text-muted shrink-0" />
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-text-muted font-mono">/{item.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{TYPE_LABELS[item.type]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs">{item.authorName}</td>
                  <td className="px-4 py-3 text-text-muted text-xs">{new Date(item.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right relative">
                    <button onClick={() => setActionMenu(actionMenu === item.id ? null : item.id)}
                      className="p-1 rounded hover:bg-bg-active transition-colors">
                      <MoreHorizontal size={16} className="text-text-muted" />
                    </button>
                    {actionMenu === item.id && (
                      <div className="absolute right-4 top-full mt-1 w-44 bg-bg-card border border-border-primary rounded-lg shadow-xl py-1 z-50">
                        <Link href={`/cms/editor?id=${item.id}`} onClick={() => setActionMenu(null)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors">
                          {permissions.edit ? <><Pencil size={12} /> Edit</> : <><Eye size={12} /> View</>}
                        </Link>
                        {permissions.publish && item.status !== 'PUBLISHED' && (
                          <button onClick={() => handlePublish(item.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-status-success hover:bg-bg-hover transition-colors">
                            <Send size={12} /> Publish
                          </button>
                        )}
                        {permissions.archive && item.status === 'PUBLISHED' && (
                          <button onClick={() => handleArchive(item.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-accent-purple hover:bg-bg-hover transition-colors">
                            <Archive size={12} /> Archive
                          </button>
                        )}
                        {permissions.delete && (
                          <button onClick={() => handleDelete(item.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-status-error hover:bg-bg-hover transition-colors">
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Role info */}
      <div className="mt-4 px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg">
        <p className="text-[10px] uppercase tracking-wider text-text-muted">Your CMS Permissions</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {(Object.entries(permissions) as [string, boolean][]).map(([key, val]) => (
            <span key={key} className={`text-[11px] px-2 py-0.5 rounded ${val ? 'bg-status-success/10 text-status-success' : 'bg-border-secondary text-text-muted'}`}>
              {key}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
