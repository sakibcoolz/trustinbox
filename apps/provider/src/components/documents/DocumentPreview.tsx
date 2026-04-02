'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { useDocumentSignedUrl, isImageType } from '@/lib/graphql/documents';

interface DocumentPreviewProps {
  documentId: string;
  fileName: string;
  fileType: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentPreview({ documentId, fileName, fileType, isOpen, onClose }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [url, setUrl] = useState<string | null>(null);
  const { getSignedUrl, loading } = useDocumentSignedUrl();

  useEffect(() => {
    if (isOpen && documentId) {
      getSignedUrl(documentId, '15m').then((result) => {
        if (result?.url) setUrl(result.url);
      });
    }
    return () => setUrl(null);
  }, [isOpen, documentId, getSignedUrl]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 25, 300));
    if (e.key === '-') setZoom((z) => Math.max(z - 25, 25));
  }, [onClose]);

  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const isImage = isImageType(fileType);
  const isPdf = /pdf/i.test(fileType);
  const isText = /text|plain|markdown|md/i.test(fileType);

  function handleDownload() {
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-elevated/90 border-b border-border-primary">
        <p className="text-sm font-medium truncate max-w-md">{fileName}</p>
        <div className="flex items-center gap-2">
          <button onClick={handleDownload} className="p-2 rounded-lg hover:bg-bg-hover transition-colors" title="Download">
            <Download size={16} className="text-text-muted" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-hover transition-colors" title="Close">
            <X size={16} className="text-text-muted" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-accent-blue animate-spin" />
            <p className="text-sm text-text-muted">Loading preview…</p>
          </div>
        ) : !url ? (
          <div className="text-center">
            <p className="text-text-muted">Failed to load preview</p>
            <button onClick={onClose} className="mt-2 text-sm text-accent-blue hover:underline">Close</button>
          </div>
        ) : isImage ? (
          <img
            src={url}
            alt={fileName}
            className="max-w-full max-h-full object-contain transition-transform"
            style={{ transform: `scale(${zoom / 100})` }}
          />
        ) : isPdf ? (
          <iframe
            src={url}
            title={fileName}
            className="w-full h-full rounded-lg bg-white"
            style={{ maxWidth: `${zoom}%` }}
          />
        ) : isText ? (
          <div className="w-full max-w-3xl bg-bg-card border border-border-primary rounded-lg p-6 overflow-auto max-h-full">
            <p className="text-sm text-text-muted mb-2">Text preview — <a href={url} download={fileName} className="text-accent-blue hover:underline">Download</a></p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-text-secondary">Preview not available for this file type</p>
            <button onClick={handleDownload} className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
              <Download size={14} className="inline mr-1" /> Download to view
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {(isImage || isPdf) && (
        <div className="flex items-center justify-center gap-4 px-4 py-3 bg-bg-elevated/90 border-t border-border-primary">
          <button onClick={() => setZoom((z) => Math.max(z - 25, 25))} className="p-1.5 rounded hover:bg-bg-hover text-text-muted">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-text-muted w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom((z) => Math.min(z + 25, 300))} className="p-1.5 rounded hover:bg-bg-hover text-text-muted">
            <ZoomIn size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
