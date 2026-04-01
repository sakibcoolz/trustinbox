'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, Image, FileText, Film, File, Search, Copy, Check,
} from 'lucide-react';
import { cms, type MediaItem, ApiError } from '@/lib/api';
import { useCMSPermissions } from '@/hooks/useAuth';

const ICON_MAP: Record<string, React.ComponentType<{ size: number; className?: string }>> = {
  image: Image,
  video: Film,
  pdf: FileText,
};

function getIcon(mime: string) {
  if (mime.startsWith('image/')) return ICON_MAP.image;
  if (mime.startsWith('video/')) return ICON_MAP.video;
  if (mime === 'application/pdf') return ICON_MAP.pdf;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CMSMediaPage() {
  const { permissions, loading: authLoading } = useCMSPermissions();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await cms.listMedia();
      setItems(res.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (let i = 0; i < files.length; i++) {
        await cms.uploadMedia(files[i]);
      }
      fetchMedia();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this media file?')) return;
    try {
      await cms.deleteMedia(id);
      fetchMedia();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  function copyUrl(item: MediaItem) {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = items.filter((item) =>
    !search || item.filename.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) return <div className="p-8 text-text-muted">Loading…</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Media Library</h1>
          <p className="text-text-secondary text-sm mt-1">{items.length} files</p>
        </div>
        {permissions.manageMedia && (
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
            <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload Files'}
          </button>
        )}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">{error}</div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files…"
          className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Image size={32} className="mx-auto text-text-muted mb-2" />
          <p className="text-text-muted text-sm">{items.length === 0 ? 'No media uploaded yet.' : 'No results match your search.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => {
            const Icon = getIcon(item.mimeType);
            const isImage = item.mimeType.startsWith('image/');
            return (
              <div key={item.id} className="bg-bg-card border border-border-primary rounded-xl overflow-hidden group hover:border-border-secondary transition-colors">
                {/* Preview */}
                <div className="aspect-square bg-bg-secondary flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
                  ) : (
                    <Icon size={32} className="text-text-muted" />
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-medium truncate" title={item.filename}>{item.filename}</p>
                  <p className="text-[11px] text-text-muted">{formatSize(item.size)}</p>
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => copyUrl(item)} title="Copy URL"
                      className="p-1 rounded hover:bg-bg-hover transition-colors">
                      {copiedId === item.id ? <Check size={12} className="text-status-success" /> : <Copy size={12} className="text-text-muted" />}
                    </button>
                    {permissions.manageMedia && (
                      <button onClick={() => handleDelete(item.id)} title="Delete"
                        className="p-1 rounded hover:bg-bg-hover transition-colors">
                        <Trash2 size={12} className="text-status-error" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
