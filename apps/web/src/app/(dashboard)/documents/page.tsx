'use client';

import { useState, useCallback, useMemo, useEffect, Suspense } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { useDetailParam } from '@/hooks/useDetailParam';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileText } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

function fileIcon(fileType: string) {
  if (fileType?.includes('pdf')) return { color: 'bg-accent-red/10 text-accent-red', label: 'PDF' };
  if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return { color: 'bg-accent-green/10 text-accent-green', label: 'XLS' };
  if (fileType?.includes('word') || fileType?.includes('document')) return { color: 'bg-accent-blue/10 text-accent-blue', label: 'DOC' };
  return { color: 'bg-bg-tertiary text-text-muted', label: 'FILE' };
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-sm text-text-muted">Loading…</p></div>}>
      <DocumentsContent />
    </Suspense>
  );
}

function DocumentsContent() {
  const { documents, loading, error } = useDocuments();
  const { token } = useAuth();
  const { selectedId, setSelectedId, clearSelectedId } = useDetailParam();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Auto-open mobile detail when deep-linked
  useEffect(() => {
    if (selectedId) setMobileShowDetail(true);
  }, [selectedId]);

  const filtered = useMemo(() =>
    documents.filter((d: any) =>
      (d.fileName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (d.serviceProvider?.name ?? '').toLowerCase().includes(search.toLowerCase())
    ),
    [documents, search]
  );

  const selected = documents.find((d: any) => d.id === selectedId);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
  }, []);

  const handleDownload = useCallback(async (doc: any) => {
    const docId = doc.documentId || doc.id;
    if (!docId || !token) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/gateway/documents/signed-url/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to get download URL');
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank', 'noopener');
    } catch {
      // Fallback: direct download via gateway proxy
      window.open(`/api/gateway/documents/signed-url/${docId}`, '_blank', 'noopener');
    } finally {
      setDownloading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <>
        <div className="flex w-full sm:w-panel h-full flex-col bg-bg-secondary border-r border-border-primary sm:shrink-0">
          <div className="px-4 pt-4 pb-2 space-y-3">
            <h2 className="text-lg font-semibold text-text-primary">Documents</h2>
          </div>
          <div className="flex-1 px-4 space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-xl bg-bg-tertiary shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-bg-tertiary rounded" />
                  <div className="h-3 w-24 bg-bg-tertiary rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden sm:flex flex-1 items-center justify-center bg-bg-primary">
          <p className="text-sm text-text-muted">Loading documents…</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-bg-primary">
        <div className="text-center space-y-3">
          <p className="text-sm text-accent-red">Failed to load documents</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* List */}
      <div className={`${mobileShowDetail ? 'hidden sm:flex' : 'flex'} w-full sm:w-panel h-full flex-col bg-bg-secondary border-r border-border-primary sm:shrink-0`}>
        <div className="px-4 pt-4 pb-2 space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Documents</h2>
          <div className="relative">
            <svg className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…" className="input-field w-full pl-9" />
          </div>
          <p className="text-2xs text-text-muted">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No shared documents"
              description="Documents shared by service providers will appear here. They'll be securely accessible through presigned links."
            />
          ) : (
            filtered.map((doc: any) => {
              const icon = fileIcon(doc.fileType ?? '');
              return (
                <button key={doc.id} onClick={() => handleSelect(doc.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border-primary hover:bg-bg-hover transition-colors ${selectedId === doc.id ? 'bg-bg-active border-l-2 border-l-accent-blue' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl ${icon.color} flex items-center justify-center text-xs font-bold shrink-0`}>{icon.label}</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate text-text-primary block">{doc.fileName ?? 'Untitled'}</span>
                    <p className="text-2xs text-text-muted truncate mt-0.5">{doc.serviceProvider?.name ?? '—'}{doc.fileSize ? ` · ${doc.fileSize}` : ''}</p>
                  </div>
                  <span className="text-2xs text-text-muted shrink-0">{new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail / Viewer */}
      <div className={`${mobileShowDetail ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-bg-primary`}>
        <div className="sm:hidden h-[60px] px-4 flex items-center border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
          <button onClick={() => setMobileShowDetail(false)} className="btn-icon mr-2" aria-label="Back">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <h3 className="text-sm font-semibold text-text-primary">Document Preview</h3>
        </div>

        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={FileText}
              title="Select a document"
              description="Choose a document from the list to preview or download it"
              size="lg"
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Doc header */}
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl ${fileIcon(selected.fileType ?? '').color} flex items-center justify-center text-lg font-bold shrink-0`}>
                {fileIcon(selected.fileType ?? '').label}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-text-primary break-words">{selected.fileName ?? 'Untitled'}</h2>
                <p className="text-sm text-text-muted mt-0.5">Shared by {selected.serviceProvider?.name ?? 'Unknown'}</p>
              </div>
            </div>

            {/* Details card */}
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">File Size</p>
                  <p className="text-sm text-text-primary mt-1">{selected.fileSize ?? '—'}</p>
                </div>
                <div>
                  <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Shared On</p>
                  <p className="text-sm text-text-primary mt-1">{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">First Opened</p>
                  <p className="text-sm text-text-primary mt-1">{selected.openedAt ? new Date(selected.openedAt).toLocaleString() : '—'}</p>
                </div>
                {selected.downloadCount != null && (
                <div>
                  <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Downloads</p>
                  <p className="text-sm text-text-primary mt-1">{selected.downloadCount} time{selected.downloadCount !== 1 ? 's' : ''}</p>
                </div>
                )}
              </div>
              <div>
                <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Share Context</p>
                <p className="text-sm text-text-secondary mt-1">{selected.shareContext ?? '—'}</p>
              </div>
            </div>

            {/* Secure viewer placeholder */}
            <div className="card">
              <p className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-3">Secure Preview</p>
              <div className="bg-bg-tertiary rounded-lg h-64 flex items-center justify-center border border-border-secondary">
                <div className="text-center space-y-2">
                  <svg className="w-12 h-12 text-text-muted mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <p className="text-sm text-text-muted">Document preview via presigned URL</p>
                  <p className="text-2xs text-text-muted">Content is loaded securely from encrypted storage</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => handleDownload(selected)} disabled={downloading} className="btn-primary flex-1 disabled:opacity-50">
                <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                {downloading ? 'Loading…' : 'Download'}
              </button>
              <button className="btn-secondary flex-1">
                <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                View Full
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
