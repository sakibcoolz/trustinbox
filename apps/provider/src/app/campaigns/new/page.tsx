'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function NewCampaignPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', type: 'Organizational', channel: 'Email', targetType: 'all', segmentId: '',
    subject: '', body: '', scheduleType: 'now', scheduledAt: '', batchSize: '1000', batchInterval: '60',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const steps = ['Details', 'Audience', 'Content', 'Schedule', 'Review'];

  async function handleSubmit() {
    // Mock create
    await new Promise((r) => setTimeout(r, 500));
    window.location.href = '/campaigns';
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">New Campaign</h1>
          <p className="text-text-secondary text-sm mt-0.5">Create a new campaign in {steps.length} steps</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${step === i + 1 ? 'bg-accent-blue/10 text-accent-blue' : step > i + 1 ? 'text-status-success' : 'text-text-muted'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === i + 1 ? 'bg-accent-blue text-white' : step > i + 1 ? 'bg-status-success/20 text-status-success' : 'bg-border-secondary text-text-muted'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              {s}
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-border-secondary" />}
          </div>
        ))}
      </div>

      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        {step === 1 && (
          <>
            <h3 className="text-sm font-semibold">Campaign Details</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Campaign Name</label>
              <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Q2 Customer Onboarding" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Type</label>
                <select value={form.type} onChange={(e) => update('type', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                  <option>Personal</option>
                  <option>Organizational</option>
                  <option>Advertisement</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Channel</label>
                <select value={form.channel} onChange={(e) => update('channel', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                  <option>Email</option>
                  <option>SMS</option>
                  <option>Push</option>
                  <option>Email + Push</option>
                  <option>All Channels</option>
                </select>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-sm font-semibold">Target Audience</h3>
            <div className="flex gap-2">
              {['all', 'segment', 'list'].map((t) => (
                <button type="button" key={t} onClick={() => update('targetType', t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${form.targetType === t ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}`}>
                  {t === 'all' ? 'All Customers' : t === 'segment' ? 'Segment' : 'Upload List'}
                </button>
              ))}
            </div>
            {form.targetType === 'segment' && (
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Select Segment</label>
                <select value={form.segmentId} onChange={(e) => update('segmentId', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                  <option value="">Choose a segment…</option>
                  <option value="active">Active customers (last 30 days)</option>
                  <option value="new">New customers (last 7 days)</option>
                  <option value="premium">Premium subscribers</option>
                </select>
              </div>
            )}
            <div className="p-3 bg-bg-tertiary rounded-lg text-xs text-text-muted">
              Estimated reach: <span className="font-medium text-text-primary">5,200 customers</span>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="text-sm font-semibold">Campaign Content</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Subject</label>
              <input type="text" value={form.subject} onChange={(e) => update('subject', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Important update from Acme Corp" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Body</label>
              <textarea value={form.body} onChange={(e) => update('body', e.target.value)} rows={8}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
                placeholder="Compose your message…" />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3 className="text-sm font-semibold">Scheduling & Batching</h3>
            <div className="flex gap-2">
              {['now', 'scheduled'].map((s) => (
                <button type="button" key={s} onClick={() => update('scheduleType', s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${form.scheduleType === s ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}`}>
                  {s === 'now' ? 'Send Immediately' : 'Schedule'}
                </button>
              ))}
            </div>
            {form.scheduleType === 'scheduled' && (
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Start Date & Time</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e) => update('scheduledAt', e.target.value)}
                  className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Batch Size</label>
                <input type="number" value={form.batchSize} onChange={(e) => update('batchSize', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Interval (minutes)</label>
                <input type="number" value={form.batchInterval} onChange={(e) => update('batchInterval', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
              </div>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h3 className="text-sm font-semibold">Review Campaign</h3>
            <div className="space-y-3">
              {[
                { label: 'Name', value: form.name || '—' },
                { label: 'Type', value: form.type },
                { label: 'Channel', value: form.channel },
                { label: 'Audience', value: form.targetType === 'all' ? 'All Customers' : `Segment: ${form.segmentId}` },
                { label: 'Subject', value: form.subject || '—' },
                { label: 'Schedule', value: form.scheduleType === 'now' ? 'Immediately' : form.scheduledAt },
                { label: 'Batching', value: `${form.batchSize} per batch, ${form.batchInterval} min interval` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-text-muted">{r.label}</span>
                  <span className="text-text-primary font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}
          className="px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30">
          Back
        </button>
        {step < 5 ? (
          <button onClick={() => setStep(step + 1)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleSubmit}
            className="px-6 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
            Launch Campaign
          </button>
        )}
      </div>
    </div>
  );
}
