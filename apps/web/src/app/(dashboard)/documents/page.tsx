'use client';

import { useState } from 'react';

interface Doc {
  id: string;
  name: string;
  org: string;
  type: 'pdf' | 'image' | 'statement' | 'contract';
  size: string;
  date: string;
  status: 'new' | 'viewed' | 'signed';
}

const docs: Doc[] = [
  { id: '1', name: 'Account Statement - Dec 2024', org: 'Acme Bank', type: 'statement', size: '245 KB', date: '2h ago', status: 'new' },
  { id: '2', name: 'Health Insurance Policy.pdf', org: 'MediCare Plus', type: 'contract', size: '1.2 MB', date: '1d ago', status: 'viewed' },
  { id: '3', name: 'Lab Report - Blood Test', org: 'City Hospital', type: 'pdf', size: '380 KB', date: '2d ago', status: 'viewed' },
  { id: '4', name: 'Property Agreement Draft', org: 'Quick Realty', type: 'contract', size: '890 KB', date: '3d ago', status: 'new' },
  { id: '5', name: 'Payment Receipt #TXN-4521', org: 'SecurePay', type: 'statement', size: '56 KB', date: '5d ago', status: 'signed' },
  { id: '6', name: 'Prescription - Dr. Patel', org: 'City Hospital', type: 'image', size: '1.8 MB', date: '1w ago', status: 'viewed' },
];

const typeIcons: Record<string, { icon: string; bg: string }> = {
  pdf: { icon: 'PDF', bg: 'bg-accent-red/15 text-accent-red' },
  image: { icon: 'IMG', bg: 'bg-accent-purple/15 text-accent-purple' },
  statement: { icon: 'STM', bg: 'bg-accent-green/15 text-accent-green' },
  contract: { icon: 'CTR', bg: 'bg-accent-orange/15 text-accent-orange' },
};

const statusMap: Record<string, string> = { new: 'chip-blue', viewed: 'chip-default', signed: 'chip-green' };

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = docs.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.org.toLowerCase().includes(search.toLowerCase()));
  const selected = docs.find((d) => d.id === selectedId) || null;

  return (
    <>
      {/* List */}
      <div className="w-panel h-full flex flex-col bg-bg-secondary border-r border-border-primary shrink-0">
        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Documents</h2>
            <span className="badge-count">{docs.filter((d) => d.status === 'new').length}</span>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="input-field w-full pl-9 h-9 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((doc) => {
            const ti = typeIcons[doc.type];
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 border-l-2 ${
                  selectedId === doc.id ? 'bg-bg-active border-l-accent-blue' : 'border-l-transparent hover:bg-bg-hover'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${ti.bg} flex items-center justify-center shrink-0 text-2xs font-bold`}>
                  {ti.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${doc.status === 'new' ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>{doc.name}</p>
                  <p className="text-xs text-text-muted">{doc.org} · {doc.size} · {doc.date}</p>
                </div>
                <span className={statusMap[doc.status] + ' text-2xs capitalize'}>{doc.status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-bg-primary min-w-0 overflow-hidden">
          <div className="h-[60px] px-6 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${typeIcons[selected.type].bg} flex items-center justify-center text-2xs font-bold`}>
                {typeIcons[selected.type].icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{selected.name}</h3>
                <p className="text-2xs text-text-muted">{selected.org} · {selected.size}</p>
              </div>
            </div>
            <span className={statusMap[selected.status] + ' capitalize'}>{selected.status}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Preview placeholder */}
              <div className="card aspect-[4/3] flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className={`w-20 h-20 rounded-2xl mx-auto ${typeIcons[selected.type].bg} flex items-center justify-center text-2xl font-bold`}>
                    {typeIcons[selected.type].icon}
                  </div>
                  <p className="text-sm text-text-muted">Document preview</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="card"><p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Type</p><p className="text-sm text-text-primary capitalize">{selected.type}</p></div>
                <div className="card"><p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Size</p><p className="text-sm text-text-primary">{selected.size}</p></div>
                <div className="card"><p className="text-2xs text-text-muted uppercase tracking-wider mb-1">From</p><p className="text-sm text-text-primary">{selected.org}</p></div>
                <div className="card"><p className="text-2xs text-text-muted uppercase tracking-wider mb-1">Received</p><p className="text-sm text-text-primary">{selected.date}</p></div>
              </div>
              <div className="flex gap-3">
                <button className="btn-primary">Download</button>
                <button className="btn-secondary">Share</button>
                <button className="btn-ghost">Delete</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-bg-primary">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            </div>
            <p className="text-sm text-text-muted">Select a document to preview</p>
          </div>
        </div>
      )}
    </>
  );
}
