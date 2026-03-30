'use client';

import { useState } from 'react';
import { Plug, Key, Webhook, UserCog, Plus, Copy, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';

const mockApiKeys = [
  { id: '1', name: 'Production API Key', prefix: 'pk_live_***a3f2', created: '2024-02-15', lastUsed: '2024-03-10', status: 'Active' },
  { id: '2', name: 'Staging API Key', prefix: 'pk_test_***9e1d', created: '2024-01-20', lastUsed: '2024-03-09', status: 'Active' },
  { id: '3', name: 'Legacy Key', prefix: 'pk_live_***7c5b', created: '2023-11-01', lastUsed: '2024-01-15', status: 'Revoked' },
];

const mockWebhooks = [
  { id: '1', url: 'https://api.acme.com/webhooks/trustinbox', events: ['notification.delivered', 'callback.requested'], status: 'Active', successRate: '99.2%' },
  { id: '2', url: 'https://api.acme.com/webhooks/analytics', events: ['campaign.completed', 'bot.escalated'], status: 'Active', successRate: '98.8%' },
];

const mockServiceAccounts = [
  { id: '1', name: 'CI/CD Pipeline', email: 'ci@acme-trustinbox.iam', role: 'API Access', created: '2024-02-01', lastActive: '2024-03-10' },
  { id: '2', name: 'Analytics Worker', email: 'analytics@acme-trustinbox.iam', role: 'Read Only', created: '2024-01-15', lastActive: '2024-03-10' },
];

const statusColors: Record<string, string> = {
  Active: 'bg-status-success/10 text-status-success',
  Revoked: 'bg-status-error/10 text-status-error',
};

export default function IntegrationsPage() {
  const [tab, setTab] = useState<'keys' | 'webhooks' | 'accounts'>('keys');
  const [showCreate, setShowCreate] = useState(false);

  const tabs = [
    { key: 'keys', label: 'API Keys', icon: Key },
    { key: 'webhooks', label: 'Webhooks', icon: Webhook },
    { key: 'accounts', label: 'Service Accounts', icon: UserCog },
  ] as const;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Integrations</h1>
          <p className="text-text-secondary mt-1">Manage API keys, webhooks, and service accounts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setShowCreate(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'keys' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
              <Plus size={16} /> Generate Key
            </button>
          </div>

          {showCreate && (
            <div className="bg-bg-card border border-accent-blue/30 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold">Generate New API Key</h3>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Key Name</label>
                <input type="text" className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="Production API Key" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary">Cancel</button>
                <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">Generate</button>
              </div>
            </div>
          )}

          <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-xs text-text-muted">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Key</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Last Used</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockApiKeys.map((k) => (
                  <tr key={k.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-text-muted">{k.prefix}</td>
                    <td className="px-4 py-3 text-text-muted">{k.created}</td>
                    <td className="px-4 py-3 text-text-muted">{k.lastUsed}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[k.status]}`}>{k.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted" title="Copy"><Copy size={14} /></button>
                        {k.status === 'Active' && <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error" title="Revoke"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
              <Plus size={16} /> Add Webhook
            </button>
          </div>
          <div className="space-y-3">
            {mockWebhooks.map((w) => (
              <div key={w.id} className="bg-bg-card border border-border-primary rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Webhook size={16} className="text-text-muted" />
                    <span className="text-sm font-mono">{w.url}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[w.status]}`}>{w.status}</span>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted"><RefreshCw size={14} /></button>
                    <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Events:</span>
                  {w.events.map((e) => (
                    <span key={e} className="px-2 py-0.5 bg-bg-tertiary rounded text-xs text-text-secondary">{e}</span>
                  ))}
                  <span className="ml-auto text-xs text-text-muted">Success rate: <span className="text-status-success font-medium">{w.successRate}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
              <Plus size={16} /> Create Service Account
            </button>
          </div>
          <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-xs text-text-muted">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Last Active</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockServiceAccounts.map((a) => (
                  <tr key={a.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 font-mono text-text-muted text-xs">{a.email}</td>
                    <td className="px-4 py-3 text-text-secondary">{a.role}</td>
                    <td className="px-4 py-3 text-text-muted">{a.created}</td>
                    <td className="px-4 py-3 text-text-muted">{a.lastActive}</td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
