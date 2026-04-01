'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  FileText, Upload, Search, Grid, List, X, Download, Shield, Loader2,
} from 'lucide-react';
import {
  DocumentNode,
  DocumentStatus,
  useDocuments,
  useDocumentSignedUrl,
  formatFileSize,
} from '@/lib/graphql/documents';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import UploadZone from '@/components/documents/UploadZone';
import DocumentCard from '@/components/documents/DocumentCard';
import ClassificationBadge from '@/components/documents/ClassificationBadge';
import DocumentPreview from '@/components/documents/DocumentPreview';
import ShareDocumentModal from '@/components/documents/ShareDocumentModal';
import DeleteDocumentModal from '@/components/documents/DeleteDocumentModal';
import VersionHistory from '@/components/documents/VersionHistory';

type ViewMode = 'grid' | 'list';

const classificationChips = ['All', 'invoice', 'identity', 'contract', 'report', 'general'];

function DocumentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canUpload = usePermission('documents:upload');
  const canShare = usePermission('documents:share');
  const canDelete = usePermission('documents:delete');
  const { success, error: toastError } = useToast();

  // View mode with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  useEffect(() => {
    const saved = localStorage.getItem('docs-view') as ViewMode;
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);
  function toggleViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem('docs-view', mode);
  }

  // Filters from URL
  const classificationFilter = searchParams.get('classification') ?? 'All';
  const searchQuery = searchParams.get('q') ?? '';

  // Local state
  const [search, setSearch] = useState(searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewDoc, setPreviewDoc] = useState<DocumentNode | null>(null);
  const [shareDoc, setShareDoc] = useState<DocumentNode | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DocumentNode | null>(null);
  const [versionDocId, setVersionDocId] = useState<string | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      updateURL('q', search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Data
  const { data, loading, error, refetch } = useDocuments({
    search: debouncedSearch || undefined,
    classification: classificationFilter !== 'All' ? classificationFilter : undefined,
    limit: 50,
    offset: 0,
  });

  const { getSignedUrl } = useDocumentSignedUrl();

  const documents = data?.documents?.nodes ?? [];
  const totalCount = data?.documents?.totalCount ?? 0;

  function updateURL(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'All') params.set(key, value);
    else params.delete(key);
    router.replace(`/documents?${params.toString()}`, { scroll: false });
  }

  function handleClassificationFilter(value: string) {
    updateURL('classification', value);
    setSelected(new Set());
  }

  function clearFilters() {
    router.replace('/documents', { scroll: false });
    setSearch('');
    setDebouncedSearch('');
  }

  const hasFilters = classificationFilter !== 'All' || debouncedSearch;

  // Selection
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === documents.length) setSelected(new Set());
    else setSelected(new Set(documents.map((d) => d.id)));
  }

  // Bulk download
  async function handleBulkDownload() {
    if (selected.size === 0) return;
    setBulkDownloading(true);
    try {
      for (const id of Array.from(selected)) {
        const doc = documents.find((d) => d.id === id);
        if (!doc) continue;
        const { data: urlData } = await getSignedUrl(id);
        const url = urlData?.generateDocumentShareURL?.url;
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.fileName;
          a.click();
        }
      }
      success('Downloads started');
    } catch {
      toastError('Bulk download failed');
    }
    setBulkDownloading(false);
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-text-secondary mt-1">Upload, share, and manage documents</p>
        </div>
        {canUpload && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors"
          >
            <Upload size={16} /> Upload Document
          </button>
        )}
      </div>

      {/* Upload Zone */}
      {showUpload && (
        <UploadZone onUploadComplete={() => { refetch(); setShowUpload(false); }} />
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Classification Chips */}
        <div className="flex gap-1">
          {classificationChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleClassificationFilter(chip)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                classificationFilter === chip
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-0.5 border border-border-secondary rounded-lg p-0.5 ml-auto">
          <button
            onClick={() => toggleViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-bg-hover text-text-primary' : 'text-text-muted'}`}
          >
            <List size={14} />
          </button>
          <button
            onClick={() => toggleViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-bg-hover text-text-primary' : 'text-text-muted'}`}
          >
            <Grid size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Search documents…"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-text-muted" />
            </button>
          )}
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-text-muted hover:text-text-secondary">
            Clear all
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-text-muted">
        {loading ? 'Loading…' : `Showing ${documents.length} of ${totalCount} documents`}
      </div>

      {/* Content */}
      {error ? (
        <div className="bg-bg-card border border-border-primary rounded-xl p-8 text-center">
          <p className="text-status-error text-sm">Failed to load documents</p>
          <button onClick={() => refetch()} className="mt-2 text-xs text-accent-blue hover:underline">Retry</button>
        </div>
      ) : loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-bg-card border border-border-primary rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 border-b border-border-primary animate-pulse" />
            ))}
          </div>
        )
      ) : documents.length === 0 ? (
        <div className="bg-bg-card border border-border-primary rounded-xl p-12 text-center">
          <FileText size={40} className="mx-auto text-text-muted mb-3" />
          <p className="text-text-secondary font-medium">No documents</p>
          <p className="text-text-muted text-sm mt-1">
            {hasFilters ? 'No documents match your filters' : 'Upload your first document to get started'}
          </p>
          {!hasFilters && canUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90"
            >
              <Upload size={14} className="inline mr-1" /> Upload Document
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              viewMode="grid"
              selected={selected.has(doc.id)}
              onSelect={() => toggleSelect(doc.id)}
              onPreview={() => setPreviewDoc(doc)}
              onShare={canShare ? () => setShareDoc(doc) : undefined}
              onDelete={canDelete ? () => setDeleteDoc(doc) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-xs text-text-muted">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selected.size === documents.length && documents.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border-secondary"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Classification</th>
                <th className="px-4 py-3 text-left font-medium">Size</th>
                <th className="px-4 py-3 text-left font-medium">Shared</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Uploaded</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const classification = doc.classifications?.[0];
                const statusDot = doc.status === 'ACTIVE' ? 'bg-status-success' : 'bg-text-muted';
                return (
                  <tr
                    key={doc.id}
                    className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                        className="rounded border-border-secondary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-text-muted shrink-0" />
                        <span className="font-medium truncate max-w-[200px]" title={doc.fileName}>{doc.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {classification ? (
                        <ClassificationBadge
                          classification={classification.label}
                          classifiedBy={classification.classifiedBy}
                          documentId={doc.id}
                          editable
                        />
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{formatFileSize(doc.fileSize)}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{doc.shareCount} users</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${statusDot}`} title={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs" title={new Date(doc.createdAt).toLocaleString()}>
                      {formatRelativeTime(doc.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setPreviewDoc(doc)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted" title="Preview">
                          <Search size={14} />
                        </button>
                        <button onClick={() => setVersionDocId(doc.id)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted" title="Versions">
                          <Shield size={14} />
                        </button>
                        {canShare && (
                          <button onClick={() => setShareDoc(doc)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted" title="Share">
                            <Upload size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setDeleteDoc(doc)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error" title="Delete">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="sticky bottom-0 bg-bg-elevated border border-border-primary rounded-lg px-4 py-3 flex items-center gap-4 shadow-lg">
          <span className="text-sm text-text-secondary font-medium">{selected.size} selected</span>
          <button
            onClick={handleBulkDownload}
            disabled={bulkDownloading}
            className="px-3 py-1.5 bg-accent-blue/10 text-accent-blue rounded text-xs font-medium hover:bg-accent-blue/20 transition-colors disabled:opacity-50"
          >
            {bulkDownloading ? 'Downloading…' : 'Download Selected'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-text-muted hover:text-text-secondary ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Modals & Drawers */}
      {previewDoc && (
        <DocumentPreview
          documentId={previewDoc.id}
          fileName={previewDoc.fileName}
          fileType={previewDoc.fileType}
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {shareDoc && (
        <ShareDocumentModal
          documentId={shareDoc.id}
          fileName={shareDoc.fileName}
          isOpen={true}
          onClose={() => setShareDoc(null)}
        />
      )}

      {deleteDoc && (
        <DeleteDocumentModal
          document={deleteDoc}
          isOpen={true}
          onClose={() => { setDeleteDoc(null); refetch(); }}
        />
      )}

      {versionDocId && (
        <VersionHistory
          documentId={versionDocId}
          isOpen={true}
          onClose={() => setVersionDocId(null)}
        />
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-bg-card rounded animate-pulse" />
        <div className="h-96 bg-bg-card rounded-xl animate-pulse" />
      </div>
    }>
      <DocumentsContent />
    </Suspense>
  );
}
