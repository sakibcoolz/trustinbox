'use client';

import { useState } from 'react';
import { Upload, FileText, Eye, Download, Trash2, Search } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  category: string;
  size: string;
  status: 'Active' | 'Draft' | 'Archived';
  uploadedAt: string;
  sharedWith: number;
}

interface DocumentManagerProps {
  documents?: Document[];
  onUpload?: (file: File) => void;
  onDelete?: (id: string) => void;
}

const defaultDocs: Document[] = [
  { id: '1', name: 'Service Agreement v2.1.pdf', category: 'Legal', size: '2.4 MB', status: 'Active', uploadedAt: '2024-03-10', sharedWith: 3 },
  { id: '2', name: 'Privacy Policy.pdf', category: 'Compliance', size: '1.1 MB', status: 'Active', uploadedAt: '2024-03-08', sharedWith: 12 },
  { id: '3', name: 'KYC Document.pdf', category: 'KYC', size: '856 KB', status: 'Active', uploadedAt: '2024-03-07', sharedWith: 1 },
];

const statusColors: Record<string, string> = {
  Active: 'bg-status-success/10 text-status-success',
  Draft: 'bg-status-warning/10 text-status-warning',
  Archived: 'bg-border-secondary text-text-muted',
};

export default function DocumentManager({ documents = defaultDocs, onUpload, onDelete }: DocumentManagerProps) {
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const filtered = documents.filter((d) =>
    search === '' || d.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload?.(file);
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOver ? 'border-accent-blue bg-accent-blue/5' : 'border-border-secondary'}`}>
        <Upload size={20} className="mx-auto text-text-muted mb-1" />
        <p className="text-sm text-text-muted">Drop files here or <button className="text-accent-blue hover:underline">browse</button></p>
        <p className="text-xs text-text-muted mt-0.5">PDF, TXT, MD — Max 50 MB</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="Search documents…" />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 bg-bg-card border border-border-primary rounded-lg px-4 py-3 hover:bg-bg-hover transition-colors">
            <FileText size={18} className="text-text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.name}</p>
              <p className="text-xs text-text-muted">{doc.category} · {doc.size} · Shared with {doc.sharedWith}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColors[doc.status]}`}>{doc.status}</span>
            <div className="flex gap-1 shrink-0">
              <button className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><Eye size={14} /></button>
              <button className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><Download size={14} /></button>
              <button onClick={() => onDelete?.(doc.id)} className="p-1.5 rounded hover:bg-bg-hover text-status-error"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
