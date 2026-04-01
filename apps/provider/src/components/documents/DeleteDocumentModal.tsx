'use client';

import { AlertTriangle, Archive } from 'lucide-react';
import { DocumentNode, useDeleteDocument, useArchiveDocument } from '@/lib/graphql/documents';
import { useToast } from '@/components/Toast';

interface DeleteDocumentModalProps {
  document: DocumentNode;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteDocumentModal({ document: doc, isOpen, onClose }: DeleteDocumentModalProps) {
  const { deleteDocument, loading: deleting } = useDeleteDocument();
  const { archiveDocument, loading: archiving } = useArchiveDocument();
  const { success, error: toastError } = useToast();

  if (!isOpen) return null;

  async function handleDelete() {
    try {
      await deleteDocument(doc.id);
      success('Document deleted');
      onClose();
    } catch {
      toastError('Failed to delete document');
    }
  }

  async function handleArchive() {
    try {
      await archiveDocument(doc.id);
      success('Document archived');
      onClose();
    } catch {
      toastError('Failed to archive document');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-elevated border border-border-primary rounded-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-status-error" />
          <h2 className="text-lg font-semibold">Delete Document</h2>
        </div>

        <p className="text-sm text-text-secondary">
          Are you sure you want to delete <span className="font-medium text-text-primary">&ldquo;{doc.fileName}&rdquo;</span>?
        </p>

        {/* Warnings */}
        <div className="space-y-2">
          {doc.shareCount > 0 && (
            <div className="flex items-center gap-2 p-2 bg-status-warning/5 border border-status-warning/20 rounded-lg">
              <AlertTriangle size={12} className="text-status-warning shrink-0" />
              <span className="text-xs text-text-secondary">Shared with {doc.shareCount} users — links will stop working</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="flex-1 py-2 border border-border-secondary rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Archive size={14} /> Archive Instead
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2 bg-status-error text-white rounded-lg text-sm font-medium hover:bg-status-error/90 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>

        <button onClick={onClose} className="w-full py-2 text-xs text-text-muted hover:text-text-secondary text-center">
          Cancel
        </button>
      </div>
    </div>
  );
}
