'use client';

import { useState } from 'react';
import { Send, Eye, AlertTriangle } from 'lucide-react';

interface NotificationComposerProps {
  onSend?: (data: NotificationData) => void;
  onPolicyCheck?: (data: NotificationData) => Promise<{ allowed: boolean; reason: string }>;
}

interface NotificationData {
  category: string;
  priority: string;
  channel: string;
  subject: string;
  body: string;
  targetId: string;
}

export default function NotificationComposer({ onSend, onPolicyCheck }: NotificationComposerProps) {
  const [form, setForm] = useState<NotificationData>({
    category: 'Personal', priority: 'Normal', channel: 'SMS', subject: '', body: '', targetId: '',
  });
  const [policyResult, setPolicyResult] = useState<{ allowed: boolean; reason: string } | null>(null);
  const [sending, setSending] = useState(false);

  function update(field: keyof NotificationData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setPolicyResult(null);
  }

  async function checkPolicy() {
    if (onPolicyCheck) {
      const result = await onPolicyCheck(form);
      setPolicyResult(result);
    } else {
      setPolicyResult(
        form.category === 'Advertisement'
          ? { allowed: false, reason: 'User has opted out of advertisement notifications.' }
          : { allowed: true, reason: 'Notification passes all policy checks.' }
      );
    }
  }

  async function handleSend() {
    setSending(true);
    onSend?.(form);
    await new Promise((r) => setTimeout(r, 500));
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Category</label>
          <select value={form.category} onChange={(e) => update('category', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
            <option>Personal</option>
            <option>Organizational</option>
            <option>Advertisement</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Priority</label>
          <select value={form.priority} onChange={(e) => update('priority', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Channel</label>
          <select value={form.channel} onChange={(e) => update('channel', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
            <option>SMS</option>
            <option>Email</option>
            <option>Push</option>
            <option>In-App</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Target Virtual ID</label>
        <input type="text" value={form.targetId} onChange={(e) => update('targetId', e.target.value)}
          className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="VID-xxxxxxxx" />
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Subject</label>
        <input type="text" value={form.subject} onChange={(e) => update('subject', e.target.value)}
          className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="Notification subject" />
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-1">Body</label>
        <textarea value={form.body} onChange={(e) => update('body', e.target.value)} rows={4}
          className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
          placeholder="Notification message…" />
      </div>

      {policyResult && (
        <div className={`flex items-start gap-2 p-3 rounded-lg ${policyResult.allowed ? 'bg-status-success/10 border border-status-success/20' : 'bg-status-error/10 border border-status-error/20'}`}>
          {policyResult.allowed ? <Eye size={16} className="text-status-success mt-0.5" /> : <AlertTriangle size={16} className="text-status-error mt-0.5" />}
          <div>
            <p className={`text-sm font-medium ${policyResult.allowed ? 'text-status-success' : 'text-status-error'}`}>
              {policyResult.allowed ? 'Policy Passed' : 'Policy Blocked'}
            </p>
            <p className="text-xs text-text-muted">{policyResult.reason}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={checkPolicy}
          className="flex items-center gap-1.5 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
          <Eye size={14} /> Check Policy
        </button>
        <button onClick={handleSend} disabled={sending || !form.subject || !form.body}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
          <Send size={14} /> {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
