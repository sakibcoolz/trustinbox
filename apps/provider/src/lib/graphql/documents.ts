'use client';

import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';

// ─── Types ──────────────────────────────────────────────

export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export type ClassifiedBy = 'AI' | 'USER' | 'SYSTEM';

export type DocumentClassificationLabel = 'invoice' | 'identity' | 'contract' | 'report' | 'general';

export interface DocumentClassification {
  id: string;
  label: DocumentClassificationLabel;
  confidence: number;
  classifiedBy: ClassifiedBy;
}

export interface DocumentNode {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  status: DocumentStatus;
  classifications: DocumentClassification[];
  shareCount: number;
  uploadedBy: string;
  uploadedByName: string;
  serviceProviderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  fileSize: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  recipientVirtualId: string;
  shareContext: 'NOTIFICATION' | 'CHAT' | 'CALLBACK' | 'DIRECT';
  signedUrl?: string;
  expiresAt?: string;
  message?: string;
  createdAt: string;
}

export interface DocumentConnection {
  nodes: DocumentNode[];
  totalCount: number;
}

export interface PresignedURLResponse {
  url: string;
  s3Key: string;
  expiresAt: string;
}

export interface DocumentsVariables {
  search?: string;
  classification?: string;
  status?: DocumentStatus;
  limit?: number;
  offset?: number;
}

// ─── Classification Helpers ─────────────────────────────

export function getClassificationConfig(label: string) {
  const map: Record<string, { display: string; color: string; iconColor: string }> = {
    invoice: { display: 'Invoice', color: 'bg-purple-500/10 text-purple-400', iconColor: 'text-purple-400' },
    identity: { display: 'Identity', color: 'bg-accent-blue/10 text-accent-blue', iconColor: 'text-accent-blue' },
    contract: { display: 'Contract', color: 'bg-status-success/10 text-status-success', iconColor: 'text-status-success' },
    report: { display: 'Report', color: 'bg-accent-orange/10 text-accent-orange', iconColor: 'text-accent-orange' },
    general: { display: 'General', color: 'bg-border-secondary text-text-muted', iconColor: 'text-text-muted' },
  };
  return map[label.toLowerCase()] ?? map.general;
}

export function getFileTypeConfig(fileType: string) {
  const ext = fileType.toLowerCase().split('/').pop() ?? fileType.toLowerCase();
  const map: Record<string, { color: string; label: string }> = {
    pdf: { color: 'text-red-500', label: 'PDF' },
    docx: { color: 'text-blue-500', label: 'DOCX' },
    doc: { color: 'text-blue-500', label: 'DOC' },
    xlsx: { color: 'text-green-500', label: 'XLSX' },
    xls: { color: 'text-green-500', label: 'XLS' },
    csv: { color: 'text-green-500', label: 'CSV' },
    png: { color: 'text-purple-400', label: 'PNG' },
    jpg: { color: 'text-purple-400', label: 'JPG' },
    jpeg: { color: 'text-purple-400', label: 'JPEG' },
    gif: { color: 'text-purple-400', label: 'GIF' },
    txt: { color: 'text-text-muted', label: 'TXT' },
    md: { color: 'text-text-muted', label: 'MD' },
  };
  return map[ext] ?? { color: 'text-text-muted', label: ext.toUpperCase() };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function isImageType(fileType: string): boolean {
  return /^image\//i.test(fileType) || /\.(png|jpg|jpeg|gif|webp)$/i.test(fileType);
}

// ─── Hooks ──────────────────────────────────────────────

export function useDocuments(variables: DocumentsVariables) {
  const { search, classification, status, limit = 25, offset = 0 } = variables;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (classification) params.set('classification', classification);
  if (status) params.set('status', status);
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  const qs = params.toString();

  const result = useData<DocumentConnection>(`/api/gateway/v1/documents?${qs}`);
  return { ...result, data: result.data ? { documents: result.data } : undefined };
}

export function useDocument(id: string) {
  const result = useData<DocumentNode>(
    id ? `/api/gateway/v1/documents/${id}` : null,
    { skip: !id },
  );
  return { ...result, data: result.data ? { document: result.data } : undefined };
}

export function useDocumentVersions(documentId: string) {
  const result = useData<DocumentVersion[]>(
    documentId ? `/api/gateway/v1/documents/${documentId}/versions` : null,
    { skip: !documentId },
  );
  return { ...result, data: result.data ? { documentVersions: result.data } : undefined };
}

export function useDocumentShares(documentId: string) {
  const result = useData<DocumentShare[]>(
    documentId ? `/api/gateway/v1/documents/${documentId}/shares` : null,
    { skip: !documentId },
  );
  return { ...result, data: result.data ? { documentShares: result.data } : undefined };
}

export function useGeneratePresignedURL() {
  const { run, loading, error } = useMutationHelper<PresignedURLResponse>();
  return {
    generateURL: (fileName: string, fileType: string) =>
      run('/api/gateway/v1/documents/presigned-url', 'POST', { fileName, fileType }),
    loading,
    error,
  };
}

export function useCreateDocument() {
  const { run, loading, error } = useMutationHelper<DocumentNode>();
  return {
    create: (input: Record<string, unknown>) => run('/api/gateway/v1/documents', 'POST', input),
    loading,
    error,
  };
}

export function useDeleteDocument() {
  const { run, loading, error } = useMutationHelper();
  return {
    deleteDocument: (id: string) => run(`/api/gateway/v1/documents/${id}`, 'DELETE'),
    loading,
    error,
  };
}

export function useArchiveDocument() {
  const { run, loading, error } = useMutationHelper();
  return {
    archiveDocument: (id: string) => run(`/api/gateway/v1/documents/${id}/archive`, 'POST'),
    loading,
    error,
  };
}

export function useUpdateClassification() {
  const { run, loading, error } = useMutationHelper<DocumentNode>();
  return {
    updateClassification: (documentId: string, classification: string) =>
      run(`/api/gateway/v1/documents/${documentId}/classification`, 'PUT', { classification }),
    loading,
    error,
  };
}

export function useShareDocument() {
  const { run, loading, error } = useMutationHelper<DocumentShare>();
  return {
    share: (input: Record<string, unknown>) => run('/api/gateway/v1/documents/share', 'POST', input),
    loading,
    error,
  };
}

export function useDocumentSignedUrl() {
  const { run, loading, error } = useMutationHelper<{ url: string; expiresAt: string }>();
  return {
    getSignedUrl: (documentId: string, expiry?: string) =>
      run(`/api/gateway/v1/documents/${documentId}/signed-url`, 'POST', { expiry }),
    loading,
    error,
  };
}

// ─── Upload Helper ──────────────────────────────────────

export async function uploadToS3(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}
