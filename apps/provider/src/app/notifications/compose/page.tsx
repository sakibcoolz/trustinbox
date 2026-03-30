'use client';

import { useState } from 'react';
import { ArrowLeft, Send, Eye, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ComposeNotificationPage() {
  const [form, setForm] = useState({
    category: 'Personal',
    priority: 'Normal',
    channel: 'SMS',
    subject: '',
    body: '',
    targetType: 'individual',
    targetId: '',
    scheduleType: 'now',
    scheduledAt: '',
  });
  const [policyPreview, setPolicyPreview] = useState<null | { allowed: boolean; reason: string }>(null);
  const [sending, setSending] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setPolicyPreview(null);
  }

  function checkPolicy() {
    // Mock policy check
    if (form.category === 'Advertisement') {
      setPolicyPreview({ allowed: false, reason: 'User has opted out of advertisement notifications.' });
    } else {
      setPolicyPreview({ allowed: true, reason: 'Notification passes all policy checks.' });
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    window.location.href = '/notifications';
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Compose Notification</h1>
          <p className="text-text-secondary text-sm mt-0.5">Create and send a notification through the policy engine</p>
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-6">
        {/* Type & Priority */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Classification</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option>Personal</option>
                <option>Organizational</option>
                <option>Advertisement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => update('priority', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option>Low</option>
                <option>Normal</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Channel</label>
              <select value={form.channel} onChange={(e) => update('channel', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option>SMS</option>
                <option>Email</option>
                <option>Push</option>
                <option>In-App</option>
              </select>
            </div>
          </div>
        </div>

        {/* Target */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Target</h3>
          <div className="flex gap-2">
            {['individual', 'segment', 'all'].map((t) => (
              <button type="button" key={t} onClick={() => update('targetType', t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${form.targetType === t ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}`}>
                {t}
              </button>
            ))}
          </div>
          {form.targetType === 'individual' && (
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Virtual ID</label>
              <input type="text" value={form.targetId} onChange={(e) => update('targetId', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="VID-xxxxxxxx" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Content</h3>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Subject</label>
            <input type="text" value={form.subject} onChange={(e) => update('subject', e.target.value)} required
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="Notification subject" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Body</label>
            <textarea value={form.body} onChange={(e) => update('body', e.target.value)} required rows={5}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
              placeholder="Notification message…" />
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Schedule</h3>
          <div className="flex gap-2">
            {['now', 'scheduled'].map((s) => (
              <button type="button" key={s} onClick={() => update('scheduleType', s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${form.scheduleType === s ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}`}>
                {s === 'now' ? 'Send Now' : 'Schedule'}
              </button>
            ))}
          </div>
          {form.scheduleType === 'scheduled' && (
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => update('scheduledAt', e.target.value)}
              className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
          )}
        </div>

        {/* Policy Preview */}
        <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Policy Check</h3>
            <button type="button" onClick={checkPolicy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
              <Eye size={14} /> Preview Policy
            </button>
          </div>
          {policyPreview && (
            <div className={`flex items-start gap-3 p-3 rounded-lg ${policyPreview.allowed ? 'bg-status-success/10 border border-status-success/20' : 'bg-status-error/10 border border-status-error/20'}`}>
              {policyPreview.allowed ? (
                <Eye size={16} className="text-status-success mt-0.5" />
              ) : (
                <AlertTriangle size={16} className="text-status-error mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${policyPreview.allowed ? 'text-status-success' : 'text-status-error'}`}>
                  {policyPreview.allowed ? 'Policy Passed' : 'Policy Blocked'}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{policyPreview.reason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href="/notifications"
            className="px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={sending}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
            <Send size={16} /> {sending ? 'Sending…' : 'Send Notification'}
          </button>
        </div>
      </form>
    </div>
  );
}
