'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useCreateBot } from '@/lib/mutations/ai';
import { AGENT_TYPE_LABELS } from '@/lib/types';
import type { AgentType } from '@/lib/types';

const PROVIDERS: Array<{ value: string; models: string[] }> = [
  { value: 'openai', models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { value: 'anthropic', models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
  { value: 'google', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
];

export default function NewBotPage() {
  const router = useRouter();
  const { execute, loading, error } = useCreateBot();

  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('MANAGER');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4');
  const [systemPrompt, setSystemPrompt] = useState('');

  const models = PROVIDERS.find((p) => p.value === provider)?.models ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await execute({
      name: name.trim(),
      purpose: purpose.trim() || description.trim() || name.trim(),
      description: description.trim() || undefined,
      // The following fields are kept in the UI for forward compatibility;
      // the current gateway POST /api/v1/bots ignores unknown keys.
      agentType,
      provider,
      model,
      systemPrompt: systemPrompt.trim() || undefined,
    });
    if (result) {
      const id = (result as { id?: string }).id;
      router.push(id ? `/ai/bots/${id}` : '/ai/bots');
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href="/ai/bots"
        className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={12} /> All bots
      </Link>

      <header>
        <h2 className="text-xl font-semibold text-text-primary">New bot</h2>
        <p className="text-sm text-text-secondary mt-1">
          Configure an AI agent. Manager bots route conversations to specialists.
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        <Card padding="md" className="space-y-4">
          <Field label="Name" required>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLS}
              placeholder="e.g. Front-Desk Manager"
            />
          </Field>

          <Field label="Purpose" required>
            <input
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={INPUT_CLS}
              placeholder="e.g. Route customers to the right specialist"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${INPUT_CLS} resize-none`}
              placeholder="What does this bot do?"
            />
          </Field>

          <Field label="Agent type" required>
            <select
              value={agentType}
              onChange={(e) => setAgentType(e.target.value as AgentType)}
              className={INPUT_CLS}
            >
              {(Object.keys(AGENT_TYPE_LABELS) as AgentType[]).map((t) => (
                <option key={t} value={t}>{AGENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Provider" required>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  const p = PROVIDERS.find((x) => x.value === e.target.value);
                  if (p) setModel(p.models[0]);
                }}
                className={INPUT_CLS}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.value}</option>
                ))}
              </select>
            </Field>
            <Field label="Model" required>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={INPUT_CLS}
              >
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="System prompt">
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              className={`${INPUT_CLS} resize-none font-mono text-xs`}
              placeholder="You are a helpful assistant for…"
            />
          </Field>

          {error && <p className="text-xs text-status-error">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-primary">
            <Link
              href="/ai/bots"
              className="px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-hover"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              Create bot
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}

const INPUT_CLS =
  'w-full px-3 py-2 text-sm rounded-lg bg-bg-input border border-border-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-text-secondary mb-1 block">
        {label}
        {required && <span className="text-status-error ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
