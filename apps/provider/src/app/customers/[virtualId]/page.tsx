'use client';

import { useState } from 'react';
import { ArrowLeft, Shield, Bell, PhoneCall, FileText, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const mockCustomer = {
  virtualId: 'VID-8a3f2b',
  displayName: 'Virtual User #8a3f2b',
  userType: 'Customer',
  joinedAt: '2024-01-15',
  lastContact: '2024-03-10',
  consentStatus: 'Active',
  policies: {
    personalNotifications: true,
    orgNotifications: true,
    advertisements: false,
    callbacksAllowed: true,
  },
};

const mockNotifications = [
  { id: '1', type: 'Personal', channel: 'SMS', status: 'Delivered', sentAt: '2024-03-10 14:30', subject: 'Account verification' },
  { id: '2', type: 'Organizational', channel: 'Push', status: 'Delivered', sentAt: '2024-03-08 09:15', subject: 'Service update notice' },
  { id: '3', type: 'Personal', channel: 'Email', status: 'Failed', sentAt: '2024-03-05 11:00', subject: 'Appointment reminder' },
  { id: '4', type: 'Organizational', channel: 'SMS', status: 'Delivered', sentAt: '2024-02-28 16:45', subject: 'Policy change notification' },
];

const mockCallbacks = [
  { id: '1', status: 'Completed', requestedAt: '2024-03-09 10:00', scheduledAt: '2024-03-09 14:00', topic: 'Account inquiry' },
  { id: '2', status: 'Pending', requestedAt: '2024-03-10 11:30', scheduledAt: null, topic: 'Billing question' },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Delivered: 'bg-status-success/10 text-status-success',
    Failed: 'bg-status-error/10 text-status-error',
    Pending: 'bg-status-warning/10 text-status-warning',
    Completed: 'bg-status-success/10 text-status-success',
    Active: 'bg-status-success/10 text-status-success',
    Revoked: 'bg-status-error/10 text-status-error',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-border-secondary text-text-muted'}`}>{status}</span>;
}

export default function CustomerDetailPage({ params }: { params: { virtualId: string } }) {
  const [tab, setTab] = useState<'overview' | 'notifications' | 'callbacks'>('overview');
  const tabs = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'callbacks', label: 'Callbacks', icon: PhoneCall },
  ] as const;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Customer Detail</h1>
          <p className="text-text-secondary text-sm mt-0.5">Virtual ID: {params.virtualId}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-border-primary rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1">Display Name</p>
          <p className="text-sm font-medium">{mockCustomer.displayName}</p>
        </div>
        <div className="bg-bg-card border border-border-primary rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1">Type</p>
          <p className="text-sm font-medium">{mockCustomer.userType}</p>
        </div>
        <div className="bg-bg-card border border-border-primary rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1">Last Contact</p>
          <p className="text-sm font-medium">{mockCustomer.lastContact}</p>
        </div>
        <div className="bg-bg-card border border-border-primary rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1">Consent</p>
          <StatusBadge status={mockCustomer.consentStatus} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-bg-card border border-border-primary rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Policy Consent Summary</h3>
            <div className="space-y-3">
              {Object.entries(mockCustomer.policies).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  {val ? <CheckCircle2 size={16} className="text-status-success" /> : <XCircle size={16} className="text-status-error" />}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-bg-card border border-border-primary rounded-xl p-6">
            <h3 className="text-sm font-semibold mb-4">Activity Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Total Notifications</span><span className="font-medium">{mockNotifications.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Delivered</span><span className="font-medium text-status-success">{mockNotifications.filter((n) => n.status === 'Delivered').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Failed</span><span className="font-medium text-status-error">{mockNotifications.filter((n) => n.status === 'Failed').length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Callbacks</span><span className="font-medium">{mockCallbacks.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Joined</span><span className="font-medium">{mockCustomer.joinedAt}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Subject</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Channel</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Sent At</th>
            </tr></thead>
            <tbody>
              {mockNotifications.map((n) => (
                <tr key={n.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium">{n.subject}</td>
                  <td className="px-4 py-3 text-text-secondary">{n.type}</td>
                  <td className="px-4 py-3 text-text-secondary">{n.channel}</td>
                  <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                  <td className="px-4 py-3 text-text-muted">{n.sentAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'callbacks' && (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Topic</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Requested</th>
              <th className="px-4 py-3 text-left font-medium">Scheduled</th>
            </tr></thead>
            <tbody>
              {mockCallbacks.map((c) => (
                <tr key={c.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium">{c.topic}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-text-muted">{c.requestedAt}</td>
                  <td className="px-4 py-3 text-text-muted">{c.scheduledAt || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
