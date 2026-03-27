'use client';

import { useState } from 'react';

interface Org {
  id: string;
  name: string;
  slug: string;
  industry: string;
  verified: boolean;
  status: 'connected' | 'blocked' | 'available';
  lastContact: string;
  description: string;
}

const mockOrgs: Org[] = [
  { id: '1', name: 'Acme Bank', slug: 'o/acmebank', industry: 'Banking & Finance', verified: true, status: 'connected', lastContact: '2m ago', description: 'Leading private sector bank with 5000+ branches across India. Services include savings, loans, credit cards, and wealth management.' },
  { id: '2', name: 'City Hospital', slug: 'o/cityhospital', industry: 'Healthcare', verified: true, status: 'connected', lastContact: '15m ago', description: 'Multi-specialty hospital chain with advanced diagnostics, emergency care, and telemedicine services.' },
  { id: '3', name: 'Quick Realty', slug: 'o/quickrealty', industry: 'Real Estate', verified: true, status: 'connected', lastContact: '1h ago', description: 'Premier real estate marketplace connecting buyers, sellers, and renters across major cities.' },
  { id: '4', name: 'SecurePay', slug: 'o/securepay', industry: 'Fintech', verified: true, status: 'connected', lastContact: '5h ago', description: 'Digital payment platform with UPI, wallet, and bill payment services for 100M+ users.' },
  { id: '5', name: 'MediCare Plus', slug: 'o/medicareplus', industry: 'Insurance', verified: true, status: 'connected', lastContact: '1d ago', description: 'Health insurance provider offering comprehensive coverage plans for individuals and families.' },
  { id: '6', name: 'SpamCorp', slug: 'o/spamcorp', industry: 'Marketing', verified: false, status: 'blocked', lastContact: '3d ago', description: 'Blocked due to unsolicited communications policy violation.' },
];

const statusStyle: Record<string, string> = {
  connected: 'chip-green',
  blocked: 'chip-red',
  available: 'chip-blue',
};

const industryColors: Record<string, string> = {
  'Banking & Finance': 'bg-accent-green/15 text-accent-green',
  Healthcare: 'bg-accent-blue/15 text-accent-blue',
  'Real Estate': 'bg-accent-orange/15 text-accent-orange',
  Fintech: 'bg-accent-purple/15 text-accent-purple',
  Insurance: 'bg-accent-cyan/15 text-accent-cyan',
  Marketing: 'bg-accent-red/15 text-accent-red',
};

export default function OrganizationsPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = mockOrgs.filter((o) =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.industry.toLowerCase().includes(search.toLowerCase())
  );

  const selected = mockOrgs.find((o) => o.id === selectedId) || null;

  return (
    <>
      {/* List */}
      <div className="w-panel h-full flex flex-col bg-bg-secondary border-r border-border-primary shrink-0">
        <div className="px-4 pt-4 pb-2 space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Organizations</h2>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search organizations..." className="input-field w-full pl-9 h-9 text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((org) => (
            <div
              key={org.id}
              onClick={() => setSelectedId(org.id)}
              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 border-l-2 ${
                selectedId === org.id ? 'bg-bg-active border-l-accent-blue' : 'border-l-transparent hover:bg-bg-hover'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${industryColors[org.industry] || 'bg-bg-tertiary text-text-muted'} flex items-center justify-center shrink-0 text-sm font-bold`}>
                {org.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-text-primary truncate">{org.name}</span>
                  {org.verified && (
                    <svg className="w-3.5 h-3.5 text-accent-blue shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" /></svg>
                  )}
                </div>
                <p className="text-xs text-text-muted">{org.industry} · {org.lastContact}</p>
              </div>
              <span className={statusStyle[org.status] + ' text-2xs capitalize'}>{org.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-bg-primary min-w-0 overflow-hidden">
          <div className="h-[60px] px-6 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${industryColors[selected.industry] || 'bg-bg-tertiary text-text-muted'} flex items-center justify-center text-sm font-bold`}>
                {selected.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-text-primary">{selected.name}</h3>
                  {selected.verified && <svg className="w-3.5 h-3.5 text-accent-blue" fill="currentColor" viewBox="0 0 24 24"><path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" /></svg>}
                </div>
                <p className="text-2xs text-text-muted">{selected.slug} · {selected.industry}</p>
              </div>
            </div>
            <span className={statusStyle[selected.status] + ' capitalize'}>{selected.status}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="card">
                <p className="text-2xs text-text-muted uppercase tracking-wider mb-2">About</p>
                <p className="text-sm text-text-secondary leading-relaxed">{selected.description}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="card text-center">
                  <p className="text-2xl font-bold text-accent-blue">12</p>
                  <p className="text-2xs text-text-muted mt-1">Messages</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-accent-green">3</p>
                  <p className="text-2xs text-text-muted mt-1">Callbacks</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-accent-purple">2</p>
                  <p className="text-2xs text-text-muted mt-1">Documents</p>
                </div>
              </div>
              <div className="flex gap-3">
                {selected.status === 'blocked' ? (
                  <button className="btn-primary">Unblock</button>
                ) : (
                  <>
                    <button className="btn-secondary">Message</button>
                    <button className="btn-danger">Block</button>
                    <button className="btn-ghost">Report Spam</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-bg-primary">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
            </div>
            <p className="text-sm text-text-muted">Select an organization to view details</p>
          </div>
        </div>
      )}
    </>
  );
}
