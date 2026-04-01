'use client';

import { useState } from 'react';
import { FileText, Download, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

// ─── Types ──────────────────────────────────────────────

interface FileAttachmentProps {
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  fileType: string;
  isImage: boolean;
}

// ─── Helpers ────────────────────────────────────────────

function getFileIconConfig(type: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pdf: { bg: 'bg-red-500/10', color: 'text-red-500', label: 'PDF' },
    doc: { bg: 'bg-blue-500/10', color: 'text-blue-500', label: 'DOC' },
    docx: { bg: 'bg-blue-500/10', color: 'text-blue-500', label: 'DOCX' },
    xls: { bg: 'bg-green-500/10', color: 'text-green-500', label: 'XLS' },
    xlsx: { bg: 'bg-green-500/10', color: 'text-green-500', label: 'XLSX' },
  };
  const ext = type.toLowerCase().split('/').pop() ?? type.toLowerCase();
  return map[ext] ?? { bg: 'bg-bg-tertiary', color: 'text-text-muted', label: ext.toUpperCase() };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Image Attachment ───────────────────────────────────

function ImageAttachment({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [lightbox, setLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-bg-hover rounded-lg">
        <ImageIcon size={16} className="text-text-muted" />
        <span className="text-xs text-text-muted">Image failed to load</span>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setLightbox(true)} className="block max-w-[300px] rounded-lg overflow-hidden">
        <img
          src={fileUrl}
          alt={fileName}
          onError={() => setImgError(true)}
          className="w-full h-auto rounded-lg hover:opacity-90 transition-opacity"
          loading="lazy"
        />
      </button>

      <Modal open={lightbox} onClose={() => setLightbox(false)} title={fileName} size="xl">
        <div className="flex justify-center">
          <img src={fileUrl} alt={fileName} className="max-w-full max-h-[70vh] rounded-lg" />
        </div>
      </Modal>
    </>
  );
}

// ─── Document Card ──────────────────────────────────────

function DocumentCard({ fileUrl, fileName, fileSize, fileType }: Omit<FileAttachmentProps, 'isImage'>) {
  const config = getFileIconConfig(fileType);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-bg-hover border border-border-secondary rounded-lg max-w-[280px]">
      <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
        <FileText size={18} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{fileName}</p>
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span>{config.label}</span>
          {fileSize != null && <span>{formatFileSize(fileSize)}</span>}
        </div>
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-muted transition-colors"
        title="Download"
      >
        <Download size={14} />
      </a>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function FileAttachment({ fileUrl, fileName, fileSize, fileType, isImage }: FileAttachmentProps) {
  if (isImage) {
    return <ImageAttachment fileUrl={fileUrl} fileName={fileName} />;
  }
  return <DocumentCard fileUrl={fileUrl} fileName={fileName} fileSize={fileSize} fileType={fileType} />;
}

// ─── Upload Preview Chip ────────────────────────────────

interface UploadPreviewChipProps {
  fileName: string;
  progress: number;
  uploading: boolean;
  preview?: string;
  onRemove: () => void;
  onCancel?: () => void;
}

export function UploadPreviewChip({ fileName, progress, uploading, preview, onRemove, onCancel }: UploadPreviewChipProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-hover rounded-lg border border-border-secondary relative">
      {preview ? (
        <img src={preview} alt="" className="w-8 h-8 rounded object-cover" />
      ) : (
        <FileText size={16} className="text-text-muted" />
      )}
      <span className="text-xs text-text-secondary max-w-[100px] truncate">{fileName}</span>
      {uploading ? (
        <>
          <Loader2 size={12} className="text-accent-blue animate-spin" />
          {onCancel && (
            <button onClick={onCancel} className="p-0.5 rounded hover:bg-bg-tertiary text-text-muted">
              <X size={12} />
            </button>
          )}
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border-secondary rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-accent-blue transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <button onClick={onRemove} className="p-0.5 rounded hover:bg-bg-tertiary text-text-muted">
          <X size={12} />
        </button>
      )}
    </div>
  );
}
