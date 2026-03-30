'use client';

import { useState } from 'react';
import { Shield, Search, AlertTriangle, CheckCircle2, XCircle, FileText, Clock } from 'lucide-react';

const mockPolicyLogs = [
  { id: '1', action: 'Notification Sent', result: 'Allowed', category: 'Personal', channel: 'SMS', target: 'VID-8a3f2b', reason: 'User consent active', time: '2024-03-10 14:30' },
  { id: '2', action: 'Notification Blocked', result: 'Blocked', category: 'Advertisement', channel: 'Email', target: 'VID-4c9e1d', reason: 'User opted out of ads', time: '2024-03-10 14:15' },
  { id: '3', action: 'Callback Approved', result: 'Allowed', category: 'Personal', channel: 'Phone', target: 'VID-7f2a8c', reason: 'Callback allowed by policy', time: '2024-03-10 13:45' },
  { id: '4', action: 'Notification Sent', result: 'Allowed', category: 'Organizational', channel: 'Push', target: 'VID-1b5d3e', reason: 'Org notifications permitted', time: '2024-03-10 13:00' },
  { id: '5', action: 'Rate Limited', result: 'Blocked', category: 'Personal', channel: 'SMS', target: 'VID-9e6f4a', reason: 'Daily SMS limit exceeded', time: '2024-03-10 12:30' },
  { id: '6', action: 'Callback Rejected', result: 'Blocked', category: 'Advertisement', channel: 'Phone', target: 'VID-2d7c5b', reason: 'Ad callbacks not permitted', time: '2024-03-10 11:15' },
];

const mockSpamReports = [
  { id: '1', reportedBy: 'VID-4c9e1d', notificationId: 'NTF-2341', reason: 'Unwanted promotional', status: 'Under Review', reportedAt: '2024-03-10 10:00' },
  { id: '2', reportedBy: 'VID-9e6f4a', notificationId: 'NTF-2298', reason: 'Received after opt-out', status: 'Resolved', reportedAt: '2024-03-09 15:30' },
  { id: '3', reportedBy: 'VID-6a1e9f', notificationId: 'NTF-2256', reason: 'Excessive frequency', status: 'Under Review', reportedAt: '2024-03-08 09:45' },
];

const resultColors: Record<string, string> = {
  Allowed: 'bg-status-success/10 text-status-success',
  Blocked: 'bg-status-error/10 text-status-error',
};

const spamStatusColors: Record<string, string> = {
  'Under Review': 'bg-status-warning/10 text-status-warning',
  Resolved: 'bg-status-success/10 text-status-success',
  Dismissed: 'bg-border-secondary text-text-muted',
};

export default function CompliancePage() {
  const [tab, setTab] = useState<'policy' | 'audit' | 'spam'>('policy');
  const [search, setSearch] = useState('');

  const filteredLogs = mockPolicyLogs.filter((l) =>
    search === '' || l.target.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Compliance Center</h1>
        <p className="text-text-secondary mt-1">Policy logs, audit trail, and spam report management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Policy Decisions (24h)', value: '2,480', icon: Shield },
          { label: 'Blocked (24h)', value: '312', color: 'text-status-error', icon: XCircle },
          { label: 'Spam Reports (Open)', value: '2', color: 'text-status-warning', icon: AlertTriangle },
          { label: 'Compliance Score', value: '96.2%', color: 'text-status-success', icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">{s.label}</p>
              <s.icon size={16} className={(s as any).color || 'text-text-muted'} />
            </div>
            <p className={`text-xl font-semibold mt-1 ${(s as any).color || ''}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        {[
          { key: 'policy', label: 'Policy Decisions', icon: Shield },
          { key: 'audit', label: 'Audit Log', icon: FileText },
          { key: 'spam', label: 'Spam Reports', icon: AlertTriangle },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'policy' && (
        <>
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="Search policy logs…" />
          </div>
          <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-xs text-text-muted">
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Result</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Target</th>
                  <th className="px-4 py-3 text-left font-medium">Reason</th>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium">{l.action}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${resultColors[l.result]}`}>{l.result}</span></td>
                    <td className="px-4 py-3 text-text-secondary">{l.category}</td>
                    <td className="px-4 py-3 text-text-secondary">{l.target}</td>
                    <td className="px-4 py-3 text-text-muted">{l.reason}</td>
                    <td className="px-4 py-3 text-text-muted">{l.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'audit' && (
        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <div className="space-y-4">
            {[
              { time: '2024-03-10 14:30', event: 'API key generated', actor: 'Admin', detail: 'New key: pk_***a3f2' },
              { time: '2024-03-10 12:00', event: 'Webhook updated', actor: 'Admin', detail: 'Changed endpoint URL for callback events' },
              { time: '2024-03-09 16:30', event: 'Team member added', actor: 'Admin', detail: 'Invited sarah@acme.com as Agent' },
              { time: '2024-03-09 10:00', event: 'Bot configuration changed', actor: 'Admin', detail: 'Updated system prompt for Support Assistant' },
              { time: '2024-03-08 14:00', event: 'Campaign created', actor: 'Marketing Team', detail: 'Spring Onboarding 2024' },
            ].map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-accent-blue mt-1.5" />
                  {i < 4 && <div className="w-px flex-1 bg-border-secondary mt-1" />}
                </div>
                <div className="pb-2">
                  <p className="text-sm font-medium">{a.event}</p>
                  <p className="text-xs text-text-muted">{a.time} · {a.actor}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'spam' && (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-xs text-text-muted">
                <th className="px-4 py-3 text-left font-medium">Reported By</th>
                <th className="px-4 py-3 text-left font-medium">Notification</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Reported</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockSpamReports.map((r) => (
                <tr key={r.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium">{r.reportedBy}</td>
                  <td className="px-4 py-3 text-text-secondary">{r.notificationId}</td>
                  <td className="px-4 py-3 text-text-secondary">{r.reason}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${spamStatusColors[r.status]}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-text-muted">{r.reportedAt}</td>
                  <td className="px-4 py-3">
                    {r.status === 'Under Review' && (
                      <div className="flex gap-2">
                        <button className="px-2 py-1 bg-status-success/10 text-status-success rounded text-xs font-medium hover:bg-status-success/20">Resolve</button>
                        <button className="px-2 py-1 bg-border-secondary text-text-muted rounded text-xs font-medium hover:bg-bg-hover">Dismiss</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
