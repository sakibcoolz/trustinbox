'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Bot } from 'lucide-react';
import Link from 'next/link';

export default function NewBotPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', purpose: 'support', model: 'GPT-4o', personality: '',
    systemPrompt: '', temperature: '0.7', maxTokens: '2048',
    channels: [] as string[], escalationTopics: '',
  });

  function update(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleChannel(ch: string) {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch) ? prev.channels.filter((c) => c !== ch) : [...prev.channels, ch],
    }));
  }

  const steps = ['Basics', 'Model', 'Prompt', 'Channels'];

  async function handleCreate() {
    await new Promise((r) => setTimeout(r, 500));
    window.location.href = '/bots';
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/bots" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Create Bot</h1>
          <p className="text-text-secondary text-sm mt-0.5">Set up a new AI bot for your organization</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${step === i + 1 ? 'bg-accent-purple/10 text-accent-purple' : step > i + 1 ? 'text-status-success' : 'text-text-muted'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === i + 1 ? 'bg-accent-purple text-white' : step > i + 1 ? 'bg-status-success/20 text-status-success' : 'bg-border-secondary text-text-muted'}`}>
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
            <h3 className="text-sm font-semibold">Bot Basics</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Bot Name</label>
              <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Support Assistant" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Purpose</label>
              <select value={form.purpose} onChange={(e) => update('purpose', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option value="support">Customer Support</option>
                <option value="sales">Sales Assistant</option>
                <option value="onboarding">Onboarding Guide</option>
                <option value="faq">FAQ Bot</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Personality Description</label>
              <input type="text" value={form.personality} onChange={(e) => update('personality', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Professional, helpful, concise" />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-sm font-semibold">Model Settings</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Model</label>
              <select value={form.model} onChange={(e) => update('model', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option>GPT-4o</option>
                <option>GPT-4-turbo</option>
                <option>GPT-3.5-turbo</option>
                <option>Claude 3 Sonnet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Temperature ({form.temperature})</label>
              <input type="range" min="0" max="1" step="0.1" value={form.temperature}
                onChange={(e) => update('temperature', e.target.value)} className="w-full accent-accent-purple" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Max Tokens</label>
              <input type="number" value={form.maxTokens} onChange={(e) => update('maxTokens', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="text-sm font-semibold">System Prompt</h3>
            <p className="text-xs text-text-muted">Define how your bot should behave and respond</p>
            <textarea value={form.systemPrompt} onChange={(e) => update('systemPrompt', e.target.value)} rows={10}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
              placeholder="You are a helpful customer support assistant…" />
          </>
        )}

        {step === 4 && (
          <>
            <h3 className="text-sm font-semibold">Channels & Escalation</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Active Channels</label>
              <div className="flex gap-2">
                {['Chat', 'In-App', 'WhatsApp', 'SMS'].map((ch) => (
                  <button type="button" key={ch} onClick={() => toggleChannel(ch)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.channels.includes(ch) ? 'bg-accent-purple/10 text-accent-purple' : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'}`}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Escalation Topics (comma-separated)</label>
              <input type="text" value={form.escalationTopics} onChange={(e) => update('escalationTopics', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Billing disputes, Account deletion, Legal inquiries" />
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}
          className="px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-30">
          Back
        </button>
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors">
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors">
            <Bot size={16} /> Create Bot
          </button>
        )}
      </div>
    </div>
  );
}
