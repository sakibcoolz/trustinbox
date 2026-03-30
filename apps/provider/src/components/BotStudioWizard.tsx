'use client';

import { useState } from 'react';
import { Bot, ArrowRight } from 'lucide-react';

interface BotStudioWizardProps {
  onComplete?: (data: BotConfig) => void;
}

interface BotConfig {
  name: string;
  purpose: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  channels: string[];
}

const stepLabels = ['Basics', 'Model', 'Prompt', 'Deploy'];

export default function BotStudioWizard({ onComplete }: BotStudioWizardProps) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<BotConfig>({
    name: '', purpose: 'support', model: 'GPT-4o', temperature: 0.7, systemPrompt: '', channels: [],
  });

  function update<K extends keyof BotConfig>(field: K, value: BotConfig[K]) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  function toggleChannel(ch: string) {
    setConfig((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch) ? prev.channels.filter((c) => c !== ch) : [...prev.channels, ch],
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {stepLabels.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${step === i ? 'bg-accent-purple/10 text-accent-purple' : step > i ? 'text-status-success' : 'text-text-muted'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === i ? 'bg-accent-purple text-white' : step > i ? 'bg-status-success/20 text-status-success' : 'bg-border-secondary'}`}>
                {step > i ? '✓' : i + 1}
              </span>
              {s}
            </div>
            {i < stepLabels.length - 1 && <div className="w-6 h-px bg-border-secondary" />}
          </div>
        ))}
      </div>

      <div className="bg-bg-card border border-border-primary rounded-xl p-5 space-y-3">
        {step === 0 && (
          <>
            <input type="text" value={config.name} onChange={(e) => update('name', e.target.value)}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              placeholder="Bot name" />
            <select value={config.purpose} onChange={(e) => update('purpose', e.target.value)}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
              <option value="support">Customer Support</option>
              <option value="sales">Sales</option>
              <option value="onboarding">Onboarding</option>
              <option value="faq">FAQ</option>
            </select>
          </>
        )}
        {step === 1 && (
          <>
            <select value={config.model} onChange={(e) => update('model', e.target.value)}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
              <option>GPT-4o</option><option>GPT-4-turbo</option><option>GPT-3.5-turbo</option><option>Claude 3 Sonnet</option>
            </select>
            <div>
              <label className="block text-xs text-text-muted mb-1">Temperature ({config.temperature})</label>
              <input type="range" min="0" max="1" step="0.1" value={config.temperature}
                onChange={(e) => update('temperature', parseFloat(e.target.value))} className="w-full accent-accent-purple" />
            </div>
          </>
        )}
        {step === 2 && (
          <textarea value={config.systemPrompt} onChange={(e) => update('systemPrompt', e.target.value)} rows={8}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
            placeholder="You are a helpful assistant…" />
        )}
        {step === 3 && (
          <>
            <p className="text-xs text-text-muted mb-2">Select deployment channels</p>
            <div className="flex gap-2">
              {['Chat', 'In-App', 'WhatsApp', 'SMS'].map((ch) => (
                <button key={ch} onClick={() => toggleChannel(ch)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${config.channels.includes(ch) ? 'bg-accent-purple/10 text-accent-purple' : 'text-text-muted hover:bg-bg-hover'}`}>
                  {ch}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
          className="px-4 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary disabled:opacity-30">Back</button>
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)}
            className="flex items-center gap-1 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium">Next <ArrowRight size={14} /></button>
        ) : (
          <button onClick={() => onComplete?.(config)}
            className="flex items-center gap-1 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium"><Bot size={14} /> Create Bot</button>
        )}
      </div>
    </div>
  );
}
