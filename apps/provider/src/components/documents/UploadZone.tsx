'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useGeneratePresignedURL, useCreateDocument, uploadToS3 } from '@/lib/graphql/documents';
import { useToast } from '@/components/Toast';

interface UploadItem {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'complete' | 'failed';
  progress: number;
  error?: string;
}

const ALLOWED_TYPES = [
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel', 'text/csv',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'text/plain', 'text/markdown',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_CONCURRENT = 3;
const MAX_BATCH = 10;

interface UploadZoneProps {
  onUploadComplete: () => void;
}

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { generateURL } = useGeneratePresignedURL();
  const { create } = useCreateDocument();
  const { success, error: toastError } = useToast();

  const updateUpload = useCallback((id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  async function processFile(item: UploadItem) {
    updateUpload(item.id, { status: 'uploading', progress: 0 });
    try {
      const { data } = await generateURL(item.file.name, item.file.type);
      if (!data?.generatePresignedURL) throw new Error('Failed to get upload URL');

      const { url, s3Key } = data.generatePresignedURL;
      await uploadToS3(url, item.file, (percent) => {
        updateUpload(item.id, { progress: percent });
      });

      await create({
        variables: {
          input: {
            fileName: item.file.name,
            fileType: item.file.type,
            fileSize: item.file.size,
            s3Key,
          },
        },
      });

      updateUpload(item.id, { status: 'complete', progress: 100 });
    } catch (err) {
      updateUpload(item.id, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }

  async function processQueue(items: UploadItem[]) {
    const queue = [...items];
    const active: Promise<void>[] = [];

    while (queue.length > 0 || active.length > 0) {
      while (active.length < MAX_CONCURRENT && queue.length > 0) {
        const item = queue.shift()!;
        const promise = processFile(item).then(() => {
          active.splice(active.indexOf(promise), 1);
        });
        active.push(promise);
      }
      if (active.length > 0) await Promise.race(active);
    }

    onUploadComplete();
    success('Upload complete');
  }

  function validateAndQueue(files: FileList | File[]) {
    const fileArray = Array.from(files).slice(0, MAX_BATCH);
    const valid: UploadItem[] = [];

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        toastError(`${file.name} exceeds 50 MB limit`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(md|csv)$/i)) {
        toastError(`${file.name}: unsupported file type`);
        continue;
      }
      valid.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: 'queued',
        progress: 0,
      });
    }

    if (valid.length > 0) {
      setUploads((prev) => [...prev, ...valid]);
      processQueue(valid);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      validateAndQueue(e.dataTransfer.files);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      validateAndQueue(e.target.files);
      e.target.value = '';
    }
  }

  function removeUpload(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-accent-blue bg-accent-blue/5' : 'border-border-secondary hover:border-border-active'
        }`}
      >
        <Upload size={24} className="mx-auto text-text-muted mb-2" />
        <p className="text-sm text-text-secondary">Drop files here or <span className="text-accent-blue">browse</span></p>
        <p className="text-xs text-text-muted mt-1">PDF, DOCX, XLSX, PNG, JPG, TXT, CSV — Max 50 MB · Up to 10 files</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-3 bg-bg-card border border-border-primary rounded-lg px-3 py-2">
              {u.status === 'uploading' && <Loader2 size={14} className="text-accent-blue animate-spin shrink-0" />}
              {u.status === 'complete' && <Check size={14} className="text-status-success shrink-0" />}
              {u.status === 'failed' && <AlertCircle size={14} className="text-status-error shrink-0" />}
              {u.status === 'queued' && <div className="w-3.5 h-3.5 rounded-full border-2 border-border-secondary shrink-0" />}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{u.file.name}</p>
                {u.status === 'uploading' && (
                  <div className="w-full h-1 bg-border-secondary rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-accent-blue rounded-full transition-all" style={{ width: `${u.progress}%` }} />
                  </div>
                )}
                {u.error && <p className="text-xs text-status-error mt-0.5">{u.error}</p>}
              </div>

              <span className="text-xs text-text-muted shrink-0">
                {u.status === 'uploading' ? `${u.progress}%` : u.status === 'queued' ? 'Waiting…' : ''}
              </span>

              {(u.status === 'complete' || u.status === 'failed') && (
                <button onClick={() => removeUpload(u.id)} className="p-0.5 rounded hover:bg-bg-hover">
                  <X size={12} className="text-text-muted" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
