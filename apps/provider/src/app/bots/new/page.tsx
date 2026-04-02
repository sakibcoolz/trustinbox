'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, Loader2, Send, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import {
  useCreateBot,
  useUpdateBotConfiguration,
  useSetBotPermission,
  useUpdateBot,
  useExecuteBotAction,
  ALLOWED_BOT_TOOLS,
  BotStatus,
} from '@/lib/graphql/bots';

interface WizardForm {
  name: string;
  purpose: string;
  description: string;
  department: string;
  industryProfileId: string;
  aiModel: string;
  temperature: number;
  maxResponseTokens: number;
  tone: string;
  writingStyle: string;
  systemPrompt: string;
  enabledTools: string[];
  deployOnCreate: boolean;
}

const STEPS = ['Basics', 'Model', 'Prompt', 'Permissions', 'Deploy'];

const PURPOSE_OPTIONS = [
  { value: 'support', label: 'Customer Support' },
  { value: 'sales', label: 'Sales Assistant' },
  { value: 'onboarding', label: 'Onboarding Guide' },
  { value: 'faq', label: 'FAQ Bot' },
  { value: 'custom', label: 'Custom' },
];

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Most capable, best quality' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Fast and capable' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and affordable' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet', description: 'Balanced performance' },
];

interface TestMessage { role: 'user' | 'bot'; text: string }

function BotTestPanel({ systemPrompt, botId }: { systemPrompt: string; botId?: string }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const { execute, loading: executing } = useExecuteBotAction();
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState('');

  async function handleSend() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    try {
      const result = await execute({
        botId: botId ?? 'test',
        serviceProviderId: spId,
        actionType: 'test_prompt',
        inputJson: JSON.stringify({ message: userMsg, systemPrompt }),
      });
      if (result?.policyDecision === 'DENIED') {
        setMessages((prev) => [...prev, { role: 'bot', text: `Policy denied: ${result.policyReason ?? 'Unknown reason'}` }]);
      } else if (result?.escalated) {
        setMessages((prev) => [...prev, { role: 'bot', text: '↗ This would be escalated to a human agent.' }]);
      } else {
        const text = result?.outputJson ? JSON.parse(result.outputJson).response ?? 'No response' : 'No response';
        setMessages((prev) => [...prev, { role: 'bot', text }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Error: unable to get response' }]);
    }
  }

  return (
    <div className="flex flex-col h-full border border-border-primary rounded-xl overflow-hidden bg-bg-card">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-primary">
        <p className="text-xs font-semibold text-text-secondary">Test Panel</p>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1">
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px] max-h-[340px]">
        {messages.length === 0 && (
          <p className="text-xs text-text-muted text-center mt-8">Send a test message to see the bot response</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-xs ${
              m.role === 'user' ? 'bg-accent-purple/10 text-accent-purple' : 'bg-bg-tertiary text-text-primary'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {executing && (
          <div className="flex justify-start">
            <div className="px-3 py-2 bg-bg-tertiary rounded-lg">
              <Loader2 size={14} className="animate-spin text-text-muted" />
            </div>
          </div>
        )}
      </div>
      <div className="p-2 border-t border-border-primary flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a test message…"
          className="flex-1 px-3 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
        <button onClick={handleSend} disabled={executing || !input.trim()}
          className="p-2 bg-accent-purple text-white rounded-lg disabled:opacity-50 hover:bg-accent-purple/90 transition-colors">
          <Send size={12} />
        </button>
      </div>
      <p className="px-3 pb-2 text-[10px] text-text-muted">Test mode — responses may differ from production</p>
    </div>
  );
}

function NewBotContent() {
  const router = useRouter();
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const canCreate = usePermission('bots:create');
  const { success, error: toastError } = useToast();

  const { create, loading: creating } = useCreateBot();
  const { updateConfig } = useUpdateBotConfiguration();
  const { setPermission } = useSetBotPermission();
  const { update: updateBot } = useUpdateBot();

  const [step, setStep] = useState(1);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);
  const [form, setForm] = useState<WizardForm>({
    name: '',
    purpose: 'support',
    description: '',
    department: '',
    industryProfileId: '',
    aiModel: 'gpt-4o',
    temperature: 0.7,
    maxResponseTokens: 2048,
    tone: 'professional',
    writingStyle: 'concise',
    systemPrompt: '',
    enabledTools: ['search_knowledge_base', 'escalate_to_human'],
    deployOnCreate: false,
  });

  function update<K extends keyof WizardForm>(field: K, value: WizardForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleTool(name: string) {
    setForm((prev) => ({
      ...prev,
      enabledTools: prev.enabledTools.includes(name)
        ? prev.enabledTools.filter((t) => t !== name)
        : [...prev.enabledTools, name],
    }));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return form.name.length >= 2 && !!form.purpose;
      case 2: return !!form.aiModel;
      case 3: return form.systemPrompt.length >= 10;
      case 4: return true;
      default: return true;
    }
  }

  async function handleCreate() {
    try {
      // Step 1: Create bot
      const result = await create({
        serviceProviderId: spId,
        name: form.name,
        purpose: form.purpose,
        description: form.description || undefined,
        department: form.department || undefined,
        industryProfileId: form.industryProfileId || undefined,
      });
      const botId = result?.id;
      if (!botId) throw new Error('No bot ID returned');
      setCreatedBotId(botId);

      // Step 2: Update configuration
      await updateConfig({
        botId,
        serviceProviderId: spId,
        aiModel: form.aiModel,
        temperature: form.temperature,
        maxResponseTokens: form.maxResponseTokens,
        tone: form.tone,
        writingStyle: form.writingStyle,
        customSystemPrompt: form.systemPrompt,
      });

      // Step 3: Set permissions
      for (const tool of ALLOWED_BOT_TOOLS) {
        await setPermission({
          botId,
          serviceProviderId: spId,
          toolName: tool.name,
          enabled: form.enabledTools.includes(tool.name),
        });
      }

      // Step 4: Deploy if requested
      if (form.deployOnCreate) {
        await updateBot({ botId, serviceProviderId: spId, status: 'ACTIVE' as BotStatus });
      }

      success(form.deployOnCreate ? 'Bot created and deployed!' : 'Bot created as draft');
      router.push(`/bots/${botId}`);
    } catch {
      toastError('Failed to create bot');
    }
  }

  if (!canCreate) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">You do not have permission to create bots.</p>
        <Link href="/bots" className="text-accent-purple text-sm hover:underline mt-2 inline-block">Back to bots</Link>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/bots" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Create Bot</h1>
          <p className="text-text-secondary text-sm mt-0.5">Set up a new AI bot in {STEPS.length} steps</p>
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i + 1 < step && setStep(i + 1)}
              disabled={i + 1 > step}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                step === i + 1 ? 'bg-accent-purple/10 text-accent-purple' :
                step > i + 1 ? 'text-status-success cursor-pointer hover:bg-bg-hover' :
                'text-text-muted'
              }`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                step === i + 1 ? 'bg-accent-purple text-white' :
                step > i + 1 ? 'bg-status-success/20 text-status-success' :
                'bg-border-secondary text-text-muted'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border-secondary" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
        {/* Step 1: Basics */}
        {step === 1 && (
          <>
            <h3 className="text-sm font-semibold">Bot Basics</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Bot Name *</label>
              <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Support Assistant" />
              {form.name.length > 0 && form.name.length < 2 && (
                <p className="text-xs text-status-error mt-1">Name must be at least 2 characters</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Purpose *</label>
              <select value={form.purpose} onChange={(e) => update('purpose', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                {PURPOSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary resize-none placeholder:text-text-muted focus:outline-none focus:border-border-active"
                placeholder="Brief description of what this bot does…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Department</label>
                <input type="text" value={form.department} onChange={(e) => update('department', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="e.g. Customer Service" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Industry Profile ID</label>
                <input type="text" value={form.industryProfileId} onChange={(e) => update('industryProfileId', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="Optional" />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Model */}
        {step === 2 && (
          <>
            <h3 className="text-sm font-semibold">Model Settings</h3>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">AI Model *</label>
              <div className="grid grid-cols-2 gap-3">
                {MODEL_OPTIONS.map((m) => (
                  <button key={m.value} type="button" onClick={() => update('aiModel', m.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      form.aiModel === m.value ? 'border-accent-purple bg-accent-purple/5 text-accent-purple' : 'border-border-secondary text-text-secondary hover:border-border-active'
                    }`}>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{m.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Temperature ({form.temperature})</label>
              <input type="range" min="0" max="1" step="0.1" value={form.temperature}
                onChange={(e) => update('temperature', parseFloat(e.target.value))} className="w-full accent-accent-purple" />
              <div className="flex justify-between text-[10px] text-text-muted"><span>Precise</span><span>Creative</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Max Response Tokens</label>
                <input type="number" value={form.maxResponseTokens} onChange={(e) => update('maxResponseTokens', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Tone</label>
                <select value={form.tone} onChange={(e) => update('tone', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Writing Style</label>
              <select value={form.writingStyle} onChange={(e) => update('writingStyle', e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
                <option value="conversational">Conversational</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </>
        )}

        {/* Step 3: Prompt + Test Panel */}
        {step === 3 && (
          <>
            <h3 className="text-sm font-semibold">System Prompt</h3>
            <p className="text-xs text-text-muted">Define how your bot should behave and respond</p>
            <div className="grid grid-cols-2 gap-4">
              <textarea value={form.systemPrompt} onChange={(e) => update('systemPrompt', e.target.value)} rows={14}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
                placeholder="You are a helpful customer support assistant…" />
              <BotTestPanel systemPrompt={form.systemPrompt} botId={createdBotId ?? undefined} />
            </div>
            <p className="text-xs text-text-muted text-right">{form.systemPrompt.length} characters {form.systemPrompt.length < 10 && '(min 10)'}</p>
          </>
        )}

        {/* Step 4: Permissions */}
        {step === 4 && (
          <>
            <h3 className="text-sm font-semibold">Bot Permissions</h3>
            <p className="text-xs text-text-muted mb-2">Choose which tools this bot can use. All actions are policy-gated.</p>
            <div className="space-y-2">
              {ALLOWED_BOT_TOOLS.map((tool) => {
                const enabled = form.enabledTools.includes(tool.name);
                return (
                  <label key={tool.name}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      enabled ? 'border-accent-purple/30 bg-accent-purple/5' : 'border-border-secondary hover:border-border-active'
                    }`}>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={enabled} onChange={() => toggleTool(tool.name)}
                        className="accent-accent-purple" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{tool.label}</p>
                        <p className="text-xs text-text-muted">{tool.description}</p>
                      </div>
                    </div>
                    <code className="text-[10px] text-text-muted font-mono">{tool.name}</code>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {/* Step 5: Deploy */}
        {step === 5 && (
          <>
            <h3 className="text-sm font-semibold">Review & Deploy</h3>
            <div className="space-y-3">
              {[
                { label: 'Name', value: form.name || '—' },
                { label: 'Purpose', value: PURPOSE_OPTIONS.find((o) => o.value === form.purpose)?.label ?? form.purpose },
                { label: 'Model', value: MODEL_OPTIONS.find((m) => m.value === form.aiModel)?.label ?? form.aiModel },
                { label: 'Temperature', value: String(form.temperature) },
                { label: 'Tone', value: form.tone },
                { label: 'System Prompt', value: form.systemPrompt ? `${form.systemPrompt.slice(0, 80)}…` : '—' },
                { label: 'Enabled Tools', value: `${form.enabledTools.length} of ${ALLOWED_BOT_TOOLS.length}` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-text-muted">{r.label}</span>
                  <span className="text-text-primary font-medium max-w-[60%] text-right">{r.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-bg-tertiary rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.deployOnCreate} onChange={(e) => update('deployOnCreate', e.target.checked)}
                  className="accent-accent-purple" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Deploy immediately</p>
                  <p className="text-xs text-text-muted">Bot will be set to ACTIVE status and start responding to conversations</p>
                </div>
              </label>
            </div>

            {!form.deployOnCreate && (
              <div className="flex items-start gap-2 p-3 bg-status-warning/5 rounded-lg border border-status-warning/20">
                <AlertTriangle size={14} className="text-status-warning mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary">Bot will be saved as Draft. You can deploy it later from the detail page.</p>
              </div>
            )}
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
          <button onClick={() => setStep(step + 1)} disabled={!canAdvance()}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50">
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleCreate} disabled={creating}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
            {form.deployOnCreate ? 'Create & Deploy' : 'Create Bot'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function NewBotPage() {
  return <NewBotContent />;
}
