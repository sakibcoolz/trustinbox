'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useUploadKnowledgeSource } from '@/lib/mutations/ai';

interface KnowledgeUploaderProps {
  botId: string;
}

const ACCEPT = '.pdf,.txt,.md,.markdown,.html,.htm,.csv,.json';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export function KnowledgeUploader({ botId }: KnowledgeUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { execute, loading, error, reset } = useUploadKnowledgeSource();
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = useCallback((file: File): string | null => {
    if (file.size > MAX_BYTES) return 'File exceeds 25 MB limit';
    return null;
  }, []);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const err = validate(file);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    reset();
    setSelected(file);
  }

  async function handleUpload() {
    if (!selected) return;
    const result = await execute({ botId, file: selected });
    if (result) {
      setSelected(null);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    }
  }

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Add knowledge</h3>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-accent-blue bg-accent-blue/5'
            : 'border-border-secondary hover:border-border-primary hover:bg-bg-hover'
        }`}
      >
        <Upload size={24} className="text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-primary">Drop a file or click to browse</p>
        <p className="text-[10px] text-text-muted mt-1">
          PDF, Markdown, HTML, TXT, CSV, JSON · max 25 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {selected && (
        <div className="mt-3 flex items-center justify-between gap-3 p-2 rounded-lg bg-bg-card border border-border-primary">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-accent-cyan shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-text-primary truncate">{selected.name}</p>
              <p className="text-[10px] text-text-muted">{(selected.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setSelected(null)}
              disabled={loading}
              aria-label="Remove file"
              className="p-1 rounded hover:bg-bg-hover text-text-muted disabled:opacity-50"
            >
              <X size={12} />
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50"
            >
              {loading && <Loader2 size={10} className="animate-spin" />}
              Index
            </button>
          </div>
        </div>
      )}

      {(localError || error) && (
        <p className="mt-2 text-xs text-status-error">{localError ?? error}</p>
      )}
    </Card>
  );
}
