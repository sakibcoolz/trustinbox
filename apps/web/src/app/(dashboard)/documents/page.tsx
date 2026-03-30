'use client';

import { useState, useCallback, useMemo } from 'react';

interface DocumentShare {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  shareContext: string;
  serviceProvider: { name: string };
  createdAt: string;
  openedAt: string | null;
  downloadCount: number;
}

const mockDocs: DocumentShare[] = [
  { id: '1', fileName: 'Auto_Policy_Renewal_2026.pdf', fileType: 'application/pdf', fileSize: '2.3 MB', shareContext: 'Policy renewal documentation', serviceProvider: { name: 'Acme Insurance' }, createdAt: '2026-03-28T10:00:00Z', openedAt: '2026-03-28T12:30:00Z', downloadCount: 2 },
  { id: '2', fileName: 'Lab_Results_March.pdf', fileType: 'application/pdf', fileSize: '450 KB', shareContext: 'Quarterly health check results', serviceProvider: { name: 'MedHealth Clinic' }, createdAt: '2026-03-25T09:00:00Z', openedAt: null, downloadCount: 0 },
  { id: '3', fileName: 'Annual_Statement_2025.xlsx', fileType: 'application/vnd.ms-excel', fileSize: '1.1 MB', shareContext: 'Year-end financial statement', serviceProvider: { name: 'Global Bank' }, createdAt: '2026-03-20T14:00:00Z', openedAt: '2026-03-21T08:00:00Z', downloadCount: 1 },
  { id: '4', fileName: 'Service_Agreement_v3.docx', fileType: 'application/msword', fileSize: '890 KB', shareContext: 'Updated service agreement for your review', serviceProvider: { name: 'TechSupport Pro' }, createdAt: '2026-03-18T16:30:00Z', openedAt: null, downloadCount: 0 },
  { id: '5', fileName: 'Invoice_March_2026.pdf', fileType: 'application/pdf', fileSize: '180 KB', shareContext: 'Monthly service invoice', serviceProvider: { name: 'TechSupport Pro' }, createdAt: '2026-03-15T11:00:00Z', openedAt: '2026-03-15T11:15:00Z', downloadCount: 3 },
];

function fileIcon(fileType: string) {
  if (fileType.includes('pdf')) return { color: 'bg-accent-red/10 text-accent-red', label: 'PDF' };
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return { color: 'bg-accent-green/10 text-accent-green', label: 'XLS' };
  if (fileType.includes('word') || fileType.includes('document')) return { color: 'bg-accent-blue/10 text-accent-blue', label: 'DOC' };
  return { color: 'bg-bg-tertiary text-text-muted', label: 'FILE' };
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentShare[]>(mockDocs);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    docs.filter((d) => d.fileName.toLowerCase().includes(search.toLowerCase()) || d.serviceProvider.name.toLowerCase().includes(search.toLowerCase())),
    [docs, search]
  );

  const selected = docs.find((d) => d.id === selectedId);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
    // Mark as opened
    setDocs((prev) => prev.map((d) => d.id === id && !d.openedAt ? { ...d, openedAt: new Date().toISOString() } : d));
  }, []);

  const handleDownload = useCallback((id: string) => {
    // In production: fetch presigned URL from /api/files/{documentId} then window.open()
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, downloadCount: d.downloadCount + 1 } : d));
  }, []);

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
          <p className="text-2xs text-text-muted">{filtered.length} document{filtered.length !== 1 ? 's' : ''} · {filtered.filter((d) => !d.openedAt).length} unread</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
              <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm text-text-muted">No documents found</p>
            </div>
          ) : (
            filtered.map((doc) => {
              const icon = fileIcon(doc.fileType);
              return (
                <button key={doc.id} onClick={() => handleSelect(doc.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border-primary hover:bg-bg-hover transition-colors ${selectedId === doc.id ? 'bg-bg-active border-l-2 border-l-accent-blue' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl ${icon.color} flex items-center justify-center text-xs font-bold shrink-0`}>{icon.label}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${!doc.openedAt ? 'text-text-primary' : 'text-text-secondary'}`}>{doc.fileName}</span>
                      {!doc.openedAt && <span className="w-2 h-2 rounded-full bg-accent-blue shrink-0" />}
                    </div>
                    <p className="text-2xs text-text-muted truncate mt-0.5">{doc.serviceProvider.name} · {doc.fileSize}</p>
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
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm text-text-muted">Select a document to preview</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Doc header */}
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl ${fileIcon(selected.fileType).color} flex items-center justify-center text-lg font-bold shrink-0`}>
                {fileIcon(selected.fileType).label}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-text-primary break-words">{selected.fileName}</h2>
                <p className="text-sm text-text-muted mt-0.5">Shared by {selected.serviceProvider.name}</p>
              </div>
            </div>

            {/* Details card */}
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">File Size</p>
                  <p className="text-sm text-text-primary mt-1">{selected.fileSize}</p>
                </div>
                <div>
                  <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Shared On</p>
                  <p className="text-sm text-text-primary mt-1">{new Date(selected.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">First Opened</p>
                  <p className="text-sm text-text-primary mt-1">{selected.openedAt ? new Date(selected.openedAt).toLocaleString() : 'Not yet opened'}</p>
                </div>
                <div>
                  <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Downloads</p>
                  <p className="text-sm text-text-primary mt-1">{selected.downloadCount} time{selected.downloadCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div>
                <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Share Context</p>
                <p className="text-sm text-text-secondary mt-1">{selected.shareContext}</p>
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
              <button onClick={() => handleDownload(selected.id)} className="btn-primary flex-1">
                <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                Download
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
