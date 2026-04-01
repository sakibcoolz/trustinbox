'use client';

import { FileText, Image, Sheet, File, Eye, Download, Trash2, Share2, MoreHorizontal } from 'lucide-react';
import { DocumentNode, formatFileSize, getClassificationConfig, isImageType } from '@/lib/graphql/documents';
import { formatRelativeTime } from '@/lib/format';
import ClassificationBadge from './ClassificationBadge';

interface DocumentCardProps {
  document: DocumentNode;
  viewMode: 'grid' | 'list';
  selected?: boolean;
  onSelect?: () => void;
  onPreview?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

function FileIcon({ fileType, className }: { fileType: string; className?: string }) {
  if (isImageType(fileType)) return <Image size={18} className={`text-purple-400 ${className}`} />;
  if (/pdf/i.test(fileType)) return <FileText size={18} className={`text-red-500 ${className}`} />;
  if (/sheet|xlsx|xls|csv/i.test(fileType)) return <Sheet size={18} className={`text-green-500 ${className}`} />;
  if (/doc|word/i.test(fileType)) return <FileText size={18} className={`text-blue-500 ${className}`} />;
  return <File size={18} className={`text-text-muted ${className}`} />;
}

export default function DocumentCard({
  document: doc, viewMode, selected, onSelect, onPreview, onShare, onDelete,
}: DocumentCardProps) {
  const classification = doc.classifications?.[0];
  const statusDot = doc.status === 'ACTIVE' ? 'bg-status-success' : 'bg-text-muted';

  if (viewMode === 'grid') {
    return (
      <div className={`bg-bg-card border rounded-xl overflow-hidden hover:border-border-active transition-colors group ${
        selected ? 'border-accent-blue' : 'border-border-primary'
      }`}>
        {/* Thumbnail area */}
        <div className="h-20 bg-bg-surface flex items-center justify-center relative">
          <FileIcon fileType={doc.fileType} className="!w-8 !h-8 opacity-40" />
          {onSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="absolute top-2 left-2 rounded border-border-secondary opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity"
            />
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <p className="text-sm font-medium truncate" title={doc.fileName}>{doc.fileName}</p>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            {classification && (
              <ClassificationBadge
                classification={classification.label}
                classifiedBy={classification.classifiedBy}
              />
            )}
            <span>{formatFileSize(doc.fileSize)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Shared with {doc.shareCount}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          </div>

          {/* Actions */}
          <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onPreview} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted" title="Preview">
              <Eye size={13} />
            </button>
            <button onClick={onShare} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted" title="Share">
              <Share2 size={13} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error" title="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List row (rendered as tr content by parent)
  return (
    <div className="flex items-center gap-3 w-full">
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="rounded border-border-secondary shrink-0"
        />
      )}
      <FileIcon fileType={doc.fileType} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={doc.fileName}>{doc.fileName}</p>
      </div>
      <div className="w-24">
        {classification ? (
          <ClassificationBadge
            classification={classification.label}
            classifiedBy={classification.classifiedBy}
          />
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </div>
      <span className="text-xs text-text-muted w-16 text-right">{formatFileSize(doc.fileSize)}</span>
      <span className="text-xs text-text-secondary w-20 text-center">{doc.shareCount} users</span>
      <span className={`w-1.5 h-1.5 rounded-full ${statusDot} shrink-0`} />
      <span className="text-xs text-text-muted w-24 text-right" title={new Date(doc.createdAt).toLocaleString()}>
        {formatRelativeTime(doc.createdAt)}
      </span>
      <div className="flex gap-1 shrink-0">
        <button onClick={onPreview} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted"><Eye size={14} /></button>
        <button onClick={onShare} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted"><Share2 size={14} /></button>
        <button onClick={onDelete} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
