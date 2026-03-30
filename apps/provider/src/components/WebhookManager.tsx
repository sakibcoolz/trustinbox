'use client';

import { useState } from 'react';
import { Webhook, Plus, Trash2, RefreshCw } from 'lucide-react';

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  status: 'Active' | 'Inactive';
  successRate: string;
}

interface WebhookManagerProps {
  webhooks?: WebhookEntry[];
  onAdd?: (url: string, events: string[]) => void;
  onDelete?: (id: string) => void;
  onTest?: (id: string) => void;
}

const defaultWebhooks: WebhookEntry[] = [
  { id: '1', url: 'https://api.acme.com/webhooks/trustinbox', events: ['notification.delivered', 'callback.requested'], status: 'Active', successRate: '99.2%' },
  { id: '2', url: 'https://api.acme.com/webhooks/analytics', events: ['campaign.completed'], status: 'Active', successRate: '98.8%' },
];

const allEvents = ['notification.delivered', 'notification.failed', 'callback.requested', 'callback.completed', 'campaign.completed', 'bot.escalated'];

export default function WebhookManager({ webhooks = defaultWebhooks, onAdd, onDelete, onTest }: WebhookManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);

  function toggleEvent(event: string) {
    setNewEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          <Plus size={14} /> Add Webhook
        </button>
      </div>

      {showAdd && (
        <div className="bg-bg-card border border-accent-blue/30 rounded-xl p-4 space-y-3">
          <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="https://your-api.com/webhook" />
          <div className="flex flex-wrap gap-2">
            {allEvents.map((ev) => (
              <button key={ev} onClick={() => toggleEvent(ev)}
                className={`px-2 py-1 rounded text-xs font-medium ${newEvents.includes(ev) ? 'bg-accent-blue/10 text-accent-blue' : 'bg-bg-tertiary text-text-muted'}`}>
                {ev}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="text-sm text-text-muted">Cancel</button>
            <button onClick={() => { onAdd?.(newUrl, newEvents); setShowAdd(false); setNewUrl(''); setNewEvents([]); }}
              className="px-3 py-1.5 bg-accent-blue text-white rounded-lg text-sm font-medium">Add</button>
          </div>
        </div>
      )}

      {webhooks.map((w) => (
        <div key={w.id} className="bg-bg-card border border-border-primary rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Webhook size={16} className="text-text-muted" />
              <span className="text-sm font-mono">{w.url}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.status === 'Active' ? 'bg-status-success/10 text-status-success' : 'bg-border-secondary text-text-muted'}`}>{w.status}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onTest?.(w.id)} className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><RefreshCw size={14} /></button>
              <button onClick={() => onDelete?.(w.id)} className="p-1.5 rounded hover:bg-bg-hover text-status-error"><Trash2 size={14} /></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {w.events.map((e) => <span key={e} className="px-2 py-0.5 bg-bg-tertiary rounded text-xs text-text-secondary">{e}</span>)}
            <span className="ml-auto text-xs text-text-muted">Success: <span className="text-status-success font-medium">{w.successRate}</span></span>
          </div>
        </div>
      ))}
    </div>
  );
}
