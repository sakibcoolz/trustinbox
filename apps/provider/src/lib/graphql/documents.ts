import { gql, useQuery, useLazyQuery, useMutation } from '@apollo/client';

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

// ─── Fragments ──────────────────────────────────────────

const DOCUMENT_FRAGMENT = gql`
  fragment DocumentFields on Document {
    id
    fileName
    fileType
    fileSize
    s3Key
    status
    classifications {
      id
      label
      confidence
      classifiedBy
    }
    shareCount
    uploadedBy
    uploadedByName
    serviceProviderId
    createdAt
    updatedAt
  }
`;

const DOCUMENT_VERSION_FRAGMENT = gql`
  fragment DocumentVersionFields on DocumentVersion {
    id
    documentId
    versionNumber
    fileSize
    uploadedBy
    uploadedByName
    createdAt
  }
`;

// ─── Queries ────────────────────────────────────────────

export const DOCUMENTS_QUERY = gql`
  ${DOCUMENT_FRAGMENT}
  query Documents(
    $search: String
    $classification: String
    $status: DocumentStatus
    $limit: Int
    $offset: Int
  ) {
    documents(
      search: $search
      classification: $classification
      status: $status
      limit: $limit
      offset: $offset
    ) {
      nodes {
        ...DocumentFields
      }
      totalCount
    }
  }
`;

export const DOCUMENT_QUERY = gql`
  ${DOCUMENT_FRAGMENT}
  query Document($id: ID!) {
    document(id: $id) {
      ...DocumentFields
    }
  }
`;

export const DOCUMENT_VERSIONS_QUERY = gql`
  ${DOCUMENT_VERSION_FRAGMENT}
  query DocumentVersions($documentId: ID!) {
    documentVersions(documentId: $documentId) {
      ...DocumentVersionFields
    }
  }
`;

export const DOCUMENT_SHARES_QUERY = gql`
  query DocumentShares($documentId: ID!) {
    documentShares(documentId: $documentId) {
      id
      documentId
      recipientVirtualId
      shareContext
      expiresAt
      message
      createdAt
    }
  }
`;

// ─── Mutations ──────────────────────────────────────────

export const GENERATE_PRESIGNED_URL = gql`
  mutation GeneratePresignedURL($fileName: String!, $fileType: String!) {
    generatePresignedURL(fileName: $fileName, fileType: $fileType) {
      url
      s3Key
      expiresAt
    }
  }
`;

export const CREATE_DOCUMENT = gql`
  ${DOCUMENT_FRAGMENT}
  mutation CreateDocument($input: CreateDocumentInput!) {
    createDocument(input: $input) {
      ...DocumentFields
    }
  }
`;

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id) {
      id
      status
    }
  }
`;

export const ARCHIVE_DOCUMENT = gql`
  mutation ArchiveDocument($id: ID!) {
    archiveDocument(id: $id) {
      id
      status
    }
  }
`;

export const UPDATE_DOCUMENT_CLASSIFICATION = gql`
  ${DOCUMENT_FRAGMENT}
  mutation UpdateDocumentClassification($documentId: ID!, $classification: String!) {
    updateDocumentClassification(documentId: $documentId, classification: $classification) {
      ...DocumentFields
    }
  }
`;

export const SHARE_DOCUMENT = gql`
  mutation ShareDocument($input: ShareDocumentInput!) {
    shareDocument(input: $input) {
      id
      documentId
      recipientVirtualId
      shareContext
      signedUrl
      expiresAt
      createdAt
    }
  }
`;

export const GENERATE_DOCUMENT_SHARE_URL = gql`
  mutation GenerateDocumentShareURL($documentId: ID!, $expiry: String) {
    generateDocumentShareURL(documentId: $documentId, expiry: $expiry) {
      url
      expiresAt
    }
  }
`;

export const TRACK_DOCUMENT_ACCESS = gql`
  mutation TrackDocumentAccess($documentId: ID!, $accessType: String!) {
    trackDocumentAccess(documentId: $documentId, accessType: $accessType)
  }
`;

// ─── Hooks ──────────────────────────────────────────────

export function useDocuments(variables: DocumentsVariables) {
  const { search, classification, status, limit = 25, offset = 0 } = variables;
  return useQuery<{ documents: DocumentConnection }>(DOCUMENTS_QUERY, {
    variables: {
      search: search || undefined,
      classification: classification || undefined,
      status: status || undefined,
      limit,
      offset,
    },
    fetchPolicy: 'cache-and-network',
  });
}

export function useDocument(id: string) {
  return useQuery<{ document: DocumentNode }>(DOCUMENT_QUERY, {
    variables: { id },
    skip: !id,
  });
}

export function useDocumentVersions(documentId: string) {
  return useQuery<{ documentVersions: DocumentVersion[] }>(DOCUMENT_VERSIONS_QUERY, {
    variables: { documentId },
    skip: !documentId,
  });
}

export function useDocumentShares(documentId: string) {
  return useQuery<{ documentShares: DocumentShare[] }>(DOCUMENT_SHARES_QUERY, {
    variables: { documentId },
    skip: !documentId,
  });
}

export function useGeneratePresignedURL() {
  const [generate, result] = useMutation<{ generatePresignedURL: PresignedURLResponse }>(GENERATE_PRESIGNED_URL);
  return {
    generateURL: (fileName: string, fileType: string) =>
      generate({ variables: { fileName, fileType } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useCreateDocument() {
  const [create, result] = useMutation(CREATE_DOCUMENT, {
    refetchQueries: ['Documents'],
  });
  return { create, loading: result.loading, error: result.error };
}

export function useDeleteDocument() {
  const [deleteMutation, result] = useMutation(DELETE_DOCUMENT, {
    refetchQueries: ['Documents'],
  });
  return {
    deleteDocument: (id: string) => deleteMutation({ variables: { id } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useArchiveDocument() {
  const [archive, result] = useMutation(ARCHIVE_DOCUMENT, {
    refetchQueries: ['Documents'],
  });
  return {
    archiveDocument: (id: string) => archive({ variables: { id } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useUpdateClassification() {
  const [update, result] = useMutation(UPDATE_DOCUMENT_CLASSIFICATION);
  return {
    updateClassification: (documentId: string, classification: string) =>
      update({ variables: { documentId, classification } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useShareDocument() {
  const [share, result] = useMutation(SHARE_DOCUMENT, {
    refetchQueries: ['DocumentShares'],
  });
  return { share, loading: result.loading, error: result.error };
}

export function useDocumentSignedUrl() {
  const [generate, result] = useMutation<{
    generateDocumentShareURL: { url: string; expiresAt: string };
  }>(GENERATE_DOCUMENT_SHARE_URL);
  return {
    getSignedUrl: (documentId: string, expiry?: string) =>
      generate({ variables: { documentId, expiry } }),
    loading: result.loading,
    error: result.error,
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
