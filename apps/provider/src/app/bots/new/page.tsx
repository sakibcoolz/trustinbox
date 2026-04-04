'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, Loader2, Send, Trash2, AlertTriangle, Plus, X, FileText, Globe, AlignLeft, HelpCircle, Code, Upload, Zap, Database } from 'lucide-react';
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
  useAddKnowledgeSource,
  ALLOWED_BOT_TOOLS,
  BotStatus,
  type KnowledgeSourceType,
} from '@/lib/graphql/bots';

// ─── Types ──────────────────────────────────────────────

interface KnowledgeSourceEntry {
  sourceType: KnowledgeSourceType;
  name: string;
  description: string;
  content: string;
  file: File | null;
}

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
  language: string;
  systemPrompt: string;
  enabledTools: string[];
  knowledgeSources: KnowledgeSourceEntry[];
  escalationTriggers: string[];
  maxConversationLength: number;
  allowFileSharing: boolean;
  deployOnCreate: boolean;
}

// ─── Constants ──────────────────────────────────────────

const STEPS = ['Basics', 'Personality', 'Tools', 'Knowledge', 'Permissions', 'Test Chat', 'Deploy'];

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

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'hi', label: 'Hindi' },
];

const DEFAULT_ESCALATION_TRIGGERS = [
  'speak to human', 'talk to agent', 'escalate', 'complaint', 'manager',
];

const TEST_SCENARIOS = [
  { label: 'Greeting', message: 'Hello, I need help' },
  { label: 'Complex Query', message: 'I want to file a complaint about my recent order #12345' },
  { label: 'Out of Scope', message: 'What is the meaning of life?' },
  { label: 'Escalation', message: 'I want to speak to a human agent' },
];

const SOURCE_TYPE_ICONS: Record<string, typeof FileText> = {
  DOCUMENT: FileText,
  URL: Globe,
  TEXT: AlignLeft,
  FAQ: HelpCircle,
  API: Code,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface TestMessage { role: 'user' | 'bot'; text: string; policyDecision?: string; escalated?: boolean; responseTime?: number }

function BotTestPanel({ systemPrompt, botId, fullWidth }: { systemPrompt: string; botId?: string; fullWidth?: boolean }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const { execute, loading: executing } = useExecuteBotAction();
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState('');

  async function handleSend(msg?: string) {
    const userMsg = (msg ?? input).trim();
    if (!userMsg) return;
    if (!msg) setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    const start = Date.now();
    try {
      const result = await execute({
        botId: botId ?? 'test',
        serviceProviderId: spId,
        actionType: 'test_prompt',
        inputJson: JSON.stringify({ message: userMsg, systemPrompt }),
      });
      const responseTime = Date.now() - start;
      if (result?.policyDecision === 'DENIED') {
        setMessages((prev) => [...prev, { role: 'bot', text: `Policy denied: ${result.policyReason ?? 'Unknown reason'}`, policyDecision: 'DENIED', responseTime }]);
      } else if (result?.escalated) {
        setMessages((prev) => [...prev, { role: 'bot', text: '↗ This would be escalated to a human agent.', escalated: true, policyDecision: 'ALLOWED', responseTime }]);
      } else {
        const text = result?.outputJson ? JSON.parse(result.outputJson).response ?? 'No response' : 'No response';
        setMessages((prev) => [...prev, { role: 'bot', text, policyDecision: 'ALLOWED', responseTime }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Error: unable to get response' }]);
    }
  }

  return (
    <div className={`flex flex-col border border-border-primary rounded-xl overflow-hidden bg-bg-card ${fullWidth ? 'h-[500px]' : 'h-full'}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-primary">
        <p className="text-xs font-semibold text-text-secondary">Test Chat</p>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1">
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>
      {fullWidth && (
        <div className="flex gap-1.5 px-3 pt-2 flex-wrap">
          {TEST_SCENARIOS.map((s) => (
            <button key={s.label} onClick={() => handleSend(s.message)}
              className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-accent-purple/5 text-accent-purple hover:bg-accent-purple/10 transition-colors">
              {s.label}
            </button>
          ))}
        </div>
      )}
      <div className={`flex-1 p-3 space-y-2 overflow-y-auto ${fullWidth ? 'min-h-[300px]' : 'min-h-[200px] max-h-[340px]'}`}>
        {messages.length === 0 && (
          <p className="text-xs text-text-muted text-center mt-8">Send a test message to see the bot response</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%]">
              <div className={`px-3 py-2 rounded-lg text-xs ${
                m.role === 'user' ? 'bg-accent-purple/10 text-accent-purple' : 'bg-bg-tertiary text-text-primary'
              }`}>
                {m.text}
              </div>
              {m.role === 'bot' && (
                <div className="flex items-center gap-2 mt-0.5 px-1">
                  {m.policyDecision && (
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                      m.policyDecision === 'ALLOWED' ? 'bg-status-success/10 text-status-success' : 'bg-status-error/10 text-status-error'
                    }`}>{m.policyDecision}</span>
                  )}
                  {m.escalated && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-status-warning/10 text-status-warning">ESCALATED</span>
                  )}
                  {m.responseTime !== undefined && (
                    <span className="text-[9px] text-text-muted">{m.responseTime}ms</span>
                  )}
                </div>
              )}
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
        <button onClick={() => handleSend()} disabled={executing || !input.trim()}
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
  const { addSource } = useAddKnowledgeSource();

  const [step, setStep] = useState(1);
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);
  const [createProgress, setCreateProgress] = useState('');
  const [showAddSource, setShowAddSource] = useState(false);
  const [triggerInput, setTriggerInput] = useState('');
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
    language: 'en',
    systemPrompt: '',
    enabledTools: ['search_knowledge_base', 'escalate_to_human'],
    knowledgeSources: [],
    escalationTriggers: [...DEFAULT_ESCALATION_TRIGGERS],
    maxConversationLength: 50,
    allowFileSharing: true,
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

  function addKnowledgeEntry(entry: KnowledgeSourceEntry) {
    setForm((prev) => ({ ...prev, knowledgeSources: [...prev.knowledgeSources, entry] }));
    setShowAddSource(false);
  }

  function removeKnowledgeEntry(index: number) {
    setForm((prev) => ({ ...prev, knowledgeSources: prev.knowledgeSources.filter((_, i) => i !== index) }));
  }

  function addTrigger() {
    const t = triggerInput.trim().toLowerCase();
    if (t && !form.escalationTriggers.includes(t)) {
      update('escalationTriggers', [...form.escalationTriggers, t]);
    }
    setTriggerInput('');
  }

  function removeTrigger(trigger: string) {
    update('escalationTriggers', form.escalationTriggers.filter((t) => t !== trigger));
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return form.name.length >= 2 && !!form.purpose;
      case 2: return !!form.aiModel && form.systemPrompt.length >= 10;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      case 6: return true;
      default: return true;
    }
  }

  async function handleCreate() {
    try {
      setCreateProgress('Creating bot…');
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

      setCreateProgress('Configuring personality…');
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

      setCreateProgress('Setting tool permissions…');
      for (const tool of ALLOWED_BOT_TOOLS) {
        await setPermission({
          botId,
          serviceProviderId: spId,
          toolName: tool.name,
          enabled: form.enabledTools.includes(tool.name),
        });
      }

      if (form.knowledgeSources.length > 0) {
        setCreateProgress('Adding knowledge sources…');
        for (const source of form.knowledgeSources) {
          try {
            await addSource({
              botId,
              serviceProviderId: spId,
              sourceType: source.sourceType,
              name: source.name,
              description: source.description || undefined,
              content: source.sourceType !== 'DOCUMENT' ? source.content : undefined,
              fileType: source.file?.name.split('.').pop(),
              fileSize: source.file?.size,
            });
          } catch {
            // Knowledge source failures are non-fatal
          }
        }
      }

      if (form.deployOnCreate) {
        setCreateProgress('Deploying…');
        await updateBot({ botId, serviceProviderId: spId, status: 'ACTIVE' as BotStatus });
      }

      success(form.deployOnCreate ? 'Bot created and deployed!' : 'Bot created as draft');
      router.push(`/bots/${botId}`);
    } catch {
      if (createdBotId) {
        toastError('Bot created but some steps failed. Please complete setup manually.');
        router.push(`/bots/${createdBotId}`);
      } else {
        toastError('Failed to create bot');
      }
    } finally {
      setCreateProgress('');
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

        {/* Step 2: Personality (merged Model + Prompt) */}
        {step === 2 && (
          <>
            <h3 className="text-sm font-semibold">Personality & Model</h3>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Temperature ({form.temperature})</label>
                <input type="range" min="0" max="1" step="0.1" value={form.temperature}
                  onChange={(e) => update('temperature', parseFloat(e.target.value))} className="w-full accent-accent-purple" />
                <div className="flex justify-between text-[10px] text-text-muted"><span>Precise</span><span>Creative</span></div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Max Response Tokens</label>
                <input type="number" value={form.maxResponseTokens} onChange={(e) => update('maxResponseTokens', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Language</label>
                <select value={form.language} onChange={(e) => update('language', e.target.value)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                  {LANGUAGE_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">System Prompt *</label>
              <textarea value={form.systemPrompt} onChange={(e) => update('systemPrompt', e.target.value)} rows={8}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
                placeholder="You are a helpful customer support assistant…" />
              <p className="text-xs text-text-muted text-right mt-1">{form.systemPrompt.length} characters {form.systemPrompt.length > 0 && form.systemPrompt.length < 10 && '(min 10)'}</p>
            </div>
          </>
        )}

        {/* Step 3: Tools */}
        {step === 3 && (
          <>
            <h3 className="text-sm font-semibold">Bot Tools</h3>
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
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${enabled ? 'bg-status-success/10 text-status-success' : 'bg-bg-tertiary text-text-muted'}`}>
                        {enabled ? 'ENABLED' : 'OFF'}
                      </span>
                      <code className="text-[10px] text-text-muted font-mono">{tool.name}</code>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {/* Step 4: Knowledge Sources */}
        {step === 4 && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Knowledge Sources</h3>
                <p className="text-xs text-text-muted">Add documents, URLs, or text that the bot can reference</p>
              </div>
              {!showAddSource && (
                <button onClick={() => setShowAddSource(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple/10 text-accent-purple rounded-lg text-xs font-medium hover:bg-accent-purple/20 transition-colors">
                  <Plus size={14} /> Add Source
                </button>
              )}
            </div>

            {showAddSource && (
              <InlineAddSourceForm onAdd={addKnowledgeEntry} onCancel={() => setShowAddSource(false)} />
            )}

            {form.knowledgeSources.length > 0 ? (
              <div className="space-y-2">
                {form.knowledgeSources.map((source, i) => {
                  const Icon = SOURCE_TYPE_ICONS[source.sourceType] ?? FileText;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-primary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                          <Icon size={14} className="text-accent-purple" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{source.name}</p>
                          <p className="text-xs text-text-muted">{source.sourceType}{source.file ? ` · ${formatFileSize(source.file.size)}` : ''}</p>
                        </div>
                      </div>
                      <button onClick={() => removeKnowledgeEntry(i)} className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : !showAddSource ? (
              <div className="text-center py-8 text-text-muted">
                <Database size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No knowledge sources added yet</p>
                <p className="text-xs mt-1">This step is optional — you can add sources later</p>
              </div>
            ) : null}
          </>
        )}

        {/* Step 5: Permissions */}
        {step === 5 && (
          <>
            <h3 className="text-sm font-semibold">Interaction Permissions</h3>
            <p className="text-xs text-text-muted mb-2">Configure user interaction limits and escalation triggers</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Max Conversation Length</label>
                <input type="number" min={1} max={500} value={form.maxConversationLength}
                  onChange={(e) => update('maxConversationLength', parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
                <p className="text-xs text-text-muted mt-1">Maximum messages per conversation</p>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">File Sharing</label>
                <label className="flex items-center gap-3 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg cursor-pointer">
                  <input type="checkbox" checked={form.allowFileSharing} onChange={(e) => update('allowFileSharing', e.target.checked)}
                    className="accent-accent-purple" />
                  <span className="text-sm text-text-primary">Allow file attachments</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5">Escalation Triggers</label>
              <p className="text-[10px] text-text-muted mb-2">Keywords or phrases that trigger handoff to a human agent</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {form.escalationTriggers.map((trigger) => (
                  <span key={trigger} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-status-warning/10 text-status-warning text-xs font-medium">
                    {trigger}
                    <button onClick={() => removeTrigger(trigger)} className="hover:text-status-error transition-colors"><X size={12} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={triggerInput} onChange={(e) => setTriggerInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTrigger())}
                  className="flex-1 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="Add a trigger phrase…" />
                <button onClick={addTrigger} disabled={!triggerInput.trim()}
                  className="px-3 py-2 bg-accent-purple/10 text-accent-purple rounded-lg text-sm font-medium hover:bg-accent-purple/20 transition-colors disabled:opacity-50">
                  Add
                </button>
              </div>
            </div>

            {form.enabledTools.length > 0 && (
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Enabled Tools Summary</label>
                <div className="flex flex-wrap gap-1.5">
                  {form.enabledTools.map((toolName) => {
                    const tool = ALLOWED_BOT_TOOLS.find((t) => t.name === toolName);
                    return (
                      <span key={toolName} className="px-2 py-1 bg-accent-purple/5 text-accent-purple text-[10px] font-medium rounded-lg">
                        {tool?.label ?? toolName}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 6: Test Chat */}
        {step === 6 && (
          <>
            <h3 className="text-sm font-semibold">Test Your Bot</h3>
            <p className="text-xs text-text-muted mb-2">Try sending messages to see how your bot responds with the current configuration</p>
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-3">
                <BotTestPanel systemPrompt={form.systemPrompt} botId={createdBotId ?? undefined} fullWidth />
              </div>
              <div className="col-span-2 space-y-3">
                <div className="bg-bg-tertiary rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"><Zap size={12} /> Configuration</h4>
                  {[
                    { label: 'Model', value: MODEL_OPTIONS.find((m) => m.value === form.aiModel)?.label ?? form.aiModel },
                    { label: 'Temperature', value: String(form.temperature) },
                    { label: 'Tone', value: form.tone },
                    { label: 'Style', value: form.writingStyle },
                    { label: 'Language', value: LANGUAGE_OPTIONS.find((l) => l.value === form.language)?.label ?? form.language },
                  ].map((r) => (
                    <div key={r.label} className="flex justify-between text-xs">
                      <span className="text-text-muted">{r.label}</span>
                      <span className="text-text-primary font-medium">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-bg-tertiary rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-text-secondary mb-2">System Prompt Preview</h4>
                  <p className="text-xs text-text-muted font-mono leading-relaxed line-clamp-6">
                    {form.systemPrompt || '(empty)'}
                  </p>
                </div>
                <div className="bg-bg-tertiary rounded-xl p-4">
                  <h4 className="text-xs font-semibold text-text-secondary mb-2">Resources</h4>
                  <p className="text-xs text-text-muted">{form.enabledTools.length} tools · {form.knowledgeSources.length} knowledge sources · {form.escalationTriggers.length} escalation triggers</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 7: Deploy */}
        {step === 7 && (
          <>
            <h3 className="text-sm font-semibold">Review & Deploy</h3>
            <div className="space-y-3">
              {[
                { label: 'Name', value: form.name || '—' },
                { label: 'Purpose', value: PURPOSE_OPTIONS.find((o) => o.value === form.purpose)?.label ?? form.purpose },
                { label: 'Model', value: MODEL_OPTIONS.find((m) => m.value === form.aiModel)?.label ?? form.aiModel },
                { label: 'Temperature', value: String(form.temperature) },
                { label: 'Tone / Style', value: `${form.tone} / ${form.writingStyle}` },
                { label: 'Language', value: LANGUAGE_OPTIONS.find((l) => l.value === form.language)?.label ?? form.language },
                { label: 'System Prompt', value: form.systemPrompt ? `${form.systemPrompt.slice(0, 80)}…` : '—' },
                { label: 'Enabled Tools', value: `${form.enabledTools.length} of ${ALLOWED_BOT_TOOLS.length}` },
                { label: 'Knowledge Sources', value: `${form.knowledgeSources.length} sources` },
                { label: 'Escalation Triggers', value: `${form.escalationTriggers.length} triggers` },
                { label: 'Max Conversation Length', value: String(form.maxConversationLength) },
                { label: 'File Sharing', value: form.allowFileSharing ? 'Allowed' : 'Disabled' },
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

            {createProgress && (
              <div className="flex items-center gap-2 p-3 bg-accent-purple/5 rounded-lg border border-accent-purple/20">
                <Loader2 size={14} className="animate-spin text-accent-purple" />
                <p className="text-xs text-accent-purple font-medium">{createProgress}</p>
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
        {step < 7 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canAdvance()}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50">
            Next <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={handleCreate} disabled={creating || !!createProgress}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50">
            {creating || createProgress ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
            {form.deployOnCreate ? 'Create & Deploy' : 'Create Bot'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Inline Add Source Form ─────────────────────────────

function InlineAddSourceForm({ onAdd, onCancel }: { onAdd: (entry: KnowledgeSourceEntry) => void; onCancel: () => void }) {
  const [form, setForm] = useState<KnowledgeSourceEntry>({
    sourceType: 'DOCUMENT',
    name: '',
    description: '',
    content: '',
    file: null,
  });

  function updateField<K extends keyof KnowledgeSourceEntry>(key: K, value: KnowledgeSourceEntry[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canSubmit(): boolean {
    if (form.name.length < 2) return false;
    if (form.sourceType === 'DOCUMENT' && !form.file) return false;
    if (['TEXT', 'FAQ', 'API', 'URL'].includes(form.sourceType) && !form.content.trim()) return false;
    return true;
  }

  return (
    <div className="bg-bg-tertiary border border-accent-purple/30 rounded-xl p-4 space-y-3">
      <h4 className="text-xs font-semibold">Add Knowledge Source</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1">Source Type *</label>
          <select value={form.sourceType} onChange={(e) => updateField('sourceType', e.target.value as KnowledgeSourceType)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
            <option value="DOCUMENT">Document Upload</option>
            <option value="URL">Web URL</option>
            <option value="TEXT">Plain Text</option>
            <option value="FAQ">FAQ</option>
            <option value="API">API Endpoint</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Name *</label>
          <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Source name" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted mb-1">Description</label>
        <input type="text" value={form.description} onChange={(e) => updateField('description', e.target.value)}
          className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="Optional description" />
      </div>

      {form.sourceType === 'DOCUMENT' && (
        <div onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) updateField('file', f); }}
          className="border-2 border-dashed border-border-secondary rounded-xl p-6 text-center hover:border-accent-purple/30 transition-colors">
          {form.file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText size={16} className="text-accent-purple" />
              <span className="text-sm text-text-primary">{form.file.name}</span>
              <span className="text-xs text-text-muted">({formatFileSize(form.file.size)})</span>
              <button onClick={() => updateField('file', null)} className="text-xs text-status-error hover:underline ml-2">Remove</button>
            </div>
          ) : (
            <>
              <Upload size={20} className="mx-auto text-text-muted mb-1" />
              <p className="text-xs text-text-muted">
                Drop file here or <label className="text-accent-purple hover:underline cursor-pointer">browse<input type="file" accept=".pdf,.md,.txt,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) updateField('file', f); }} /></label>
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">PDF, TXT, MD, DOCX — Max 10 MB</p>
            </>
          )}
        </div>
      )}

      {form.sourceType === 'URL' && (
        <div>
          <label className="block text-xs text-text-muted mb-1">URL *</label>
          <input type="url" value={form.content} onChange={(e) => updateField('content', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="https://example.com/docs" />
        </div>
      )}

      {(form.sourceType === 'TEXT' || form.sourceType === 'FAQ') && (
        <div>
          <label className="block text-xs text-text-muted mb-1">Content *</label>
          <textarea value={form.content} onChange={(e) => updateField('content', e.target.value)} rows={4}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
            placeholder={form.sourceType === 'FAQ' ? 'Q: Question\nA: Answer\n\nQ: Question\nA: Answer' : 'Paste text content here…'} />
        </div>
      )}

      {form.sourceType === 'API' && (
        <div>
          <label className="block text-xs text-text-muted mb-1">API Endpoint / OpenAPI Spec *</label>
          <textarea value={form.content} onChange={(e) => updateField('content', e.target.value)} rows={3}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
            placeholder='{"openapi": "3.0.0", ...}' />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary">Cancel</button>
        <button onClick={() => canSubmit() && onAdd(form)} disabled={!canSubmit()}
          className="px-4 py-1.5 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50">
          Add Source
        </button>
      </div>
    </div>
  );
}

export default function NewBotPage() {
  return <NewBotContent />;
}
