'use client';

import { useState } from 'react';
import { FileText, Upload, Search, Download, Eye, Trash2, Clock, Shield } from 'lucide-react';

const mockDocuments = [
  { id: '1', name: 'Service Agreement v2.1.pdf', type: 'PDF', size: '2.4 MB', uploadedAt: '2024-03-10', sharedWith: 3, status: 'Active', category: 'Legal' },
  { id: '2', name: 'Privacy Policy Update.pdf', type: 'PDF', size: '1.1 MB', uploadedAt: '2024-03-08', sharedWith: 12, status: 'Active', category: 'Compliance' },
  { id: '3', name: 'KYC Verification - VID-8a3f2b.pdf', type: 'PDF', size: '856 KB', uploadedAt: '2024-03-07', sharedWith: 1, status: 'Active', category: 'KYC' },
  { id: '4', name: 'Q1 Report Template.xlsx', type: 'XLSX', size: '340 KB', uploadedAt: '2024-03-05', sharedWith: 0, status: 'Draft', category: 'Internal' },
  { id: '5', name: 'Onboarding Guide.pdf', type: 'PDF', size: '5.2 MB', uploadedAt: '2024-02-28', sharedWith: 45, status: 'Active', category: 'Onboarding' },
  { id: '6', name: 'Terms of Service - Archived.pdf', type: 'PDF', size: '1.8 MB', uploadedAt: '2024-01-15', sharedWith: 0, status: 'Archived', category: 'Legal' },
];

const auditLog = [
  { action: 'Upload', document: 'Service Agreement v2.1.pdf', actor: 'Admin', time: '2024-03-10 10:30' },
  { action: 'Share', document: 'Privacy Policy Update.pdf', actor: 'Admin', time: '2024-03-08 14:15' },
  { action: 'View', document: 'KYC Verification - VID-8a3f2b.pdf', actor: 'Agent Sarah K.', time: '2024-03-07 16:45' },
  { action: 'Archive', document: 'Terms of Service - Archived.pdf', actor: 'Admin', time: '2024-03-01 09:00' },
];

const statusColors: Record<string, string> = {
  Active: 'bg-status-success/10 text-status-success',
  Draft: 'bg-status-warning/10 text-status-warning',
  Archived: 'bg-border-secondary text-text-muted',
};

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [tab, setTab] = useState<'documents' | 'audit'>('documents');
  const categories = ['All', 'Legal', 'Compliance', 'KYC', 'Internal', 'Onboarding'];

  const filtered = mockDocuments.filter((d) =>
    (categoryFilter === 'All' || d.category === categoryFilter) &&
    (search === '' || d.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-text-secondary mt-1">Upload, share, and manage documents with audit trail</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        <button onClick={() => setTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'documents' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
          <FileText size={15} /> Documents
        </button>
        <button onClick={() => setTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'audit' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
          <Shield size={15} /> Audit Trail
        </button>
      </div>

      {tab === 'documents' && (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Search documents…" />
            </div>
            <div className="flex gap-1">
              {categories.map((c) => (
                <button key={c} onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoryFilter === c ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-xs text-text-muted">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Size</th>
                  <th className="px-4 py-3 text-left font-medium">Shared</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Uploaded</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-text-muted shrink-0" />
                        <span className="font-medium">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{d.category}</td>
                    <td className="px-4 py-3 text-text-muted">{d.size}</td>
                    <td className="px-4 py-3 text-text-secondary">{d.sharedWith} {d.sharedWith === 1 ? 'user' : 'users'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status]}`}>{d.status}</span></td>
                    <td className="px-4 py-3 text-text-muted">{d.uploadedAt}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted"><Eye size={14} /></button>
                        <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted"><Download size={14} /></button>
                        <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'audit' && (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-xs text-text-muted">
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Document</th>
                <th className="px-4 py-3 text-left font-medium">Actor</th>
                <th className="px-4 py-3 text-left font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((l, i) => (
                <tr key={i} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium">{l.action}</td>
                  <td className="px-4 py-3 text-text-secondary">{l.document}</td>
                  <td className="px-4 py-3 text-text-secondary">{l.actor}</td>
                  <td className="px-4 py-3 text-text-muted">{l.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
