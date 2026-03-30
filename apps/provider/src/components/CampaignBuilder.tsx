'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface CampaignBuilderProps {
  onSubmit?: (data: CampaignData) => void;
}

interface CampaignData {
  name: string;
  type: string;
  channel: string;
  targetType: string;
  subject: string;
  body: string;
  scheduleType: string;
}

const steps = ['Details', 'Audience', 'Content', 'Review'];

export default function CampaignBuilder({ onSubmit }: CampaignBuilderProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CampaignData>({
    name: '', type: 'Organizational', channel: 'Email', targetType: 'all', subject: '', body: '', scheduleType: 'now',
  });

  function update(field: keyof CampaignData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-4">
      {/* Step bar */}
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${step === i ? 'bg-accent-blue/10 text-accent-blue' : step > i ? 'text-status-success' : 'text-text-muted'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === i ? 'bg-accent-blue text-white' : step > i ? 'bg-status-success/20 text-status-success' : 'bg-border-secondary'}`}>
                {step > i ? '✓' : i + 1}
              </span>
              {s}
            </button>
            {i < steps.length - 1 && <div className="w-6 h-px bg-border-secondary" />}
          </div>
        ))}
      </div>

      <div className="bg-bg-card border border-border-primary rounded-xl p-5 space-y-3">
        {step === 0 && (
          <>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="Campaign name" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.type} onChange={(e) => update('type', e.target.value)}
                className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option>Personal</option><option>Organizational</option><option>Advertisement</option>
              </select>
              <select value={form.channel} onChange={(e) => update('channel', e.target.value)}
                className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option>Email</option><option>SMS</option><option>Push</option><option>All</option>
              </select>
            </div>
          </>
        )}
        {step === 1 && (
          <div className="flex gap-2">
            {['all', 'segment', 'list'].map((t) => (
              <button key={t} onClick={() => update('targetType', t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${form.targetType === t ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:bg-bg-hover'}`}>
                {t === 'all' ? 'All Customers' : t}
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <>
            <input type="text" value={form.subject} onChange={(e) => update('subject', e.target.value)}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="Subject" />
            <textarea value={form.body} onChange={(e) => update('body', e.target.value)} rows={5}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
              placeholder="Message body…" />
          </>
        )}
        {step === 3 && (
          <div className="space-y-2 text-sm">
            {Object.entries(form).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-text-muted capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-text-primary font-medium">{v || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="px-4 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary disabled:opacity-30">Back</button>
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)}
            className="flex items-center gap-1 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium">Next <ArrowRight size={14} /></button>
        ) : (
          <button onClick={() => onSubmit?.(form)}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium">Launch</button>
        )}
      </div>
    </div>
  );
}
