'use client';

import { X, Upload, Download, Eye, Loader2 } from 'lucide-react';
import { useDocumentVersions, formatFileSize } from '@/lib/graphql/documents';
import { formatRelativeTime } from '@/lib/format';

interface VersionHistoryProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionHistory({ documentId, isOpen, onClose }: VersionHistoryProps) {
  const { data, loading } = useDocumentVersions(documentId);
  const versions = data?.documentVersions ?? [];

  if (!isOpen) return null;

  return (
    <div className={`fixed top-0 right-0 h-full w-96 bg-bg-elevated border-l border-border-primary z-50 flex flex-col transform transition-transform ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-border-primary flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold">Version History</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover transition-colors">
          <X size={18} className="text-text-muted" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-6">No version history</p>
        ) : (
          versions.map((v, i) => (
            <div key={v.id} className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
              i === 0 ? 'bg-accent-blue/5 border-accent-blue/20' : 'bg-bg-card border-border-primary'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                i === 0 ? 'bg-accent-blue/10 text-accent-blue' : 'bg-bg-surface text-text-muted'
              }`}>
                v{v.versionNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Version {v.versionNumber}
                    {i === 0 && <span className="text-xs text-accent-blue ml-1">(Current)</span>}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {v.uploadedByName} · {formatFileSize(v.fileSize)}
                </p>
                <p className="text-xs text-text-muted" title={new Date(v.createdAt).toLocaleString()}>
                  {formatRelativeTime(v.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
