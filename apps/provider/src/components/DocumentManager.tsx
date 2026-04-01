'use client';

import { useState } from 'react';
import { FileText, Eye, Download, Trash2, Share2, Search } from 'lucide-react';
import {
  DocumentNode,
  formatFileSize,
  useDocuments,
  useDocumentSignedUrl,
} from '@/lib/graphql/documents';
import { formatRelativeTime } from '@/lib/format';
import UploadZone from '@/components/documents/UploadZone';
import ClassificationBadge from '@/components/documents/ClassificationBadge';

interface DocumentManagerProps {
  serviceProviderId?: string;
  onPreview?: (doc: DocumentNode) => void;
  onShare?: (doc: DocumentNode) => void;
  onDelete?: (doc: DocumentNode) => void;
}

export default function DocumentManager({
  serviceProviderId,
  onPreview,
  onShare,
  onDelete,
}: DocumentManagerProps) {
  const [search, setSearch] = useState('');
  const { data, refetch } = useDocuments({ search: search || undefined, limit: 25 });
  const { getSignedUrl } = useDocumentSignedUrl();
  const documents = data?.documents?.nodes ?? [];

  async function handleDownload(doc: DocumentNode) {
    const { data: urlData } = await getSignedUrl(doc.id);
    const url = urlData?.generateDocumentShareURL?.url;
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <UploadZone onUploadComplete={() => refetch()} />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="Search documents…"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {documents.map((doc) => {
          const classification = doc.classifications?.[0];
          return (
            <div key={doc.id} className="flex items-center gap-3 bg-bg-card border border-border-primary rounded-lg px-4 py-3 hover:bg-bg-hover transition-colors">
              <FileText size={18} className="text-text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.fileName}</p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  {classification && (
                    <ClassificationBadge classification={classification.label} classifiedBy={classification.classifiedBy} />
                  )}
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span>· Shared with {doc.shareCount}</span>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ${doc.status === 'ACTIVE' ? 'bg-status-success' : 'bg-text-muted'}`} />
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onPreview?.(doc)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted"><Eye size={14} /></button>
                <button onClick={() => handleDownload(doc)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted"><Download size={14} /></button>
                {onShare && (
                  <button onClick={() => onShare(doc)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted"><Share2 size={14} /></button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(doc)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          );
        })}
        {documents.length === 0 && (
          <p className="text-center text-sm text-text-muted py-6">No documents yet</p>
        )}
      </div>
    </div>
  );
}
