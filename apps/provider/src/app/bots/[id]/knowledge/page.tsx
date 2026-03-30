'use client';

import { useState } from 'react';
import { ArrowLeft, Database, Plus, FileText, Globe, Upload, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const mockSources = [
  { id: '1', name: 'Product FAQ', type: 'Document', format: 'PDF', size: '2.4 MB', chunks: 156, status: 'Indexed', lastSync: '2024-03-10 10:00' },
  { id: '2', name: 'Help Center Articles', type: 'Web Crawl', format: 'HTML', size: '8.1 MB', chunks: 420, status: 'Indexed', lastSync: '2024-03-09 06:00' },
  { id: '3', name: 'API Documentation', type: 'Document', format: 'MD', size: '1.2 MB', chunks: 89, status: 'Indexed', lastSync: '2024-03-08 12:00' },
  { id: '4', name: 'Release Notes', type: 'Web Crawl', format: 'HTML', size: '3.5 MB', chunks: 210, status: 'Syncing', lastSync: '2024-03-10 14:00' },
  { id: '5', name: 'Internal Policies', type: 'Document', format: 'PDF', size: '950 KB', chunks: 62, status: 'Error', lastSync: '2024-03-07 09:00' },
];

const statusColors: Record<string, string> = {
  Indexed: 'bg-status-success/10 text-status-success',
  Syncing: 'bg-accent-blue/10 text-accent-blue',
  Error: 'bg-status-error/10 text-status-error',
  Pending: 'bg-status-warning/10 text-status-warning',
};

const typeIcons: Record<string, typeof FileText> = {
  Document: FileText,
  'Web Crawl': Globe,
};

export default function BotKnowledgePage({ params }: { params: { id: string } }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/bots/${params.id}`} className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Knowledge Sources</h1>
            <p className="text-text-secondary text-sm mt-0.5">Manage knowledge base for this bot</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors">
          <Plus size={16} /> Add Source
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Sources', value: String(mockSources.length) },
          { label: 'Total Chunks', value: mockSources.reduce((a, s) => a + s.chunks, 0).toLocaleString() },
          { label: 'Total Size', value: '16.2 MB' },
          { label: 'Last Sync', value: '2 hrs ago' },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-lg font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add Source Form */}
      {showAdd && (
        <div className="bg-bg-card border border-accent-purple/30 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Add Knowledge Source</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Source Type</label>
              <select className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option>Document Upload</option>
                <option>Web Crawl</option>
                <option>API Endpoint</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Name</label>
              <input type="text" className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Source name" />
            </div>
          </div>
          <div className="border-2 border-dashed border-border-secondary rounded-xl p-8 text-center">
            <Upload size={24} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">Drop files here or <button className="text-accent-purple hover:underline">browse</button></p>
            <p className="text-xs text-text-muted mt-1">PDF, TXT, MD, HTML — Max 50 MB</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary">Cancel</button>
            <button className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors">Add Source</button>
          </div>
        </div>
      )}

      {/* Sources Table */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Size</th>
              <th className="px-4 py-3 text-left font-medium">Chunks</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Last Sync</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockSources.map((s) => {
              const Icon = typeIcons[s.type] || FileText;
              return (
                <tr key={s.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-text-muted shrink-0" />
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{s.type}</td>
                  <td className="px-4 py-3 text-text-muted">{s.size}</td>
                  <td className="px-4 py-3 text-text-secondary">{s.chunks}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status]}`}>{s.status}</span></td>
                  <td className="px-4 py-3 text-text-muted">{s.lastSync}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted" title="Re-sync"><RefreshCw size={14} /></button>
                      <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error" title="Remove"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
