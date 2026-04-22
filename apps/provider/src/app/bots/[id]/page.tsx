'use client';

import { useState, use, Suspense } from 'react';
import { ArrowLeft, Bot as BotIcon, Settings, Database, BarChart3, Code, Shield, Activity, Trash2, Play, Pause, Archive, RotateCcw, Loader2, Send, Workflow } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import {
  useBot,
  useBotConfiguration,
  useBotPermissions,
  useBotActionLogs,
  useUpdateBot,
  useUpdateBotConfiguration,
  useSetBotPermission,
  useDeleteBot,
  useExecuteBotAction,
  useBotActionExecutedSubscription,
  getStatusConfig,
  ALLOWED_BOT_TOOLS,
  type Bot,
  type BotStatus,
  type BotConfiguration,
} from '@/lib/graphql/bots';
import { WorkflowsTab } from './WorkflowsTab';

type TabKey = 'config' | 'prompt' | 'permissions' | 'workflows' | 'activity';

/* ─── Test Panel (same as wizard) ─── */
interface TestMessage { role: 'user' | 'bot'; text: string }

function BotTestPanel({ systemPrompt, botId }: { systemPrompt: string; botId: string }) {
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
        botId,
        serviceProviderId: spId,
        actionType: 'test_prompt',
        inputJson: JSON.stringify({ message: userMsg, systemPrompt }),
      });
      const text = result?.outputJson ? JSON.parse(result.outputJson).response ?? 'No response' : 'No response';
      setMessages((prev) => [...prev, { role: 'bot', text }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Error: unable to get response' }]);
    }
  }

  return (
    <div className="flex flex-col h-full border border-border-primary rounded-xl overflow-hidden bg-bg-card">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-primary">
        <p className="text-xs font-semibold text-text-secondary">Test Panel</p>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-xs text-text-muted hover:text-text-secondary">Clear</button>
        )}
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px] max-h-[340px]">
        {messages.length === 0 && <p className="text-xs text-text-muted text-center mt-8">Send a test message</p>}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-xs ${m.role === 'user' ? 'bg-accent-purple/10 text-accent-purple' : 'bg-bg-tertiary text-text-primary'}`}>{m.text}</div>
          </div>
        ))}
        {executing && <div className="flex justify-start"><div className="px-3 py-2 bg-bg-tertiary rounded-lg"><Loader2 size={14} className="animate-spin text-text-muted" /></div></div>}
      </div>
      <div className="p-2 border-t border-border-primary flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a test message…"
          className="flex-1 px-3 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active" />
        <button onClick={handleSend} disabled={executing || !input.trim()} className="p-2 bg-accent-purple text-white rounded-lg disabled:opacity-50 hover:bg-accent-purple/90 transition-colors"><Send size={12} /></button>
      </div>
      <p className="px-3 pb-2 text-[10px] text-text-muted">Test mode — responses may differ from production</p>
    </div>
  );
}

/* ─── Status Actions (Task 10.9) ─── */
function BotStatusActions({ bot }: { bot: Bot }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const canDeploy = usePermission('bots:deploy');
  const { update, loading } = useUpdateBot();
  const { success, error: toastError } = useToast();
  const [confirmAction, setConfirmAction] = useState<{ label: string; status: BotStatus; message: string } | null>(null);

  if (!canDeploy) return null;

  const transitions: Record<string, { label: string; status: BotStatus; icon: typeof Play; className: string; confirm?: string }[]> = {
    DRAFT: [
      { label: 'Activate', status: 'ACTIVE' as BotStatus, icon: Play, className: 'bg-status-success/10 text-status-success hover:bg-status-success/20' },
      { label: 'Archive', status: 'ARCHIVED' as BotStatus, icon: Archive, className: 'bg-status-error/10 text-status-error hover:bg-status-error/20', confirm: 'Archiving will permanently disable this bot. Continue?' },
    ],
    ACTIVE: [
      { label: 'Pause', status: 'PAUSED' as BotStatus, icon: Pause, className: 'bg-status-warning/10 text-status-warning hover:bg-status-warning/20', confirm: 'Pausing will stop all bot conversations. Continue?' },
      { label: 'Archive', status: 'ARCHIVED' as BotStatus, icon: Archive, className: 'bg-status-error/10 text-status-error hover:bg-status-error/20', confirm: 'Archiving will permanently disable this bot. Continue?' },
    ],
    PAUSED: [
      { label: 'Activate', status: 'ACTIVE' as BotStatus, icon: Play, className: 'bg-status-success/10 text-status-success hover:bg-status-success/20' },
      { label: 'Archive', status: 'ARCHIVED' as BotStatus, icon: Archive, className: 'bg-status-error/10 text-status-error hover:bg-status-error/20', confirm: 'Archiving will permanently disable this bot. Continue?' },
    ],
    ARCHIVED: [
      { label: 'Reactivate', status: 'DRAFT' as BotStatus, icon: RotateCcw, className: 'bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20' },
    ],
  };

  const actions = transitions[bot.status] ?? [];

  async function changeStatus(newStatus: BotStatus) {
    try {
      await update({ botId: bot.id, serviceProviderId: spId, status: newStatus });
      success(`Bot ${newStatus === 'ACTIVE' ? 'activated' : newStatus === 'PAUSED' ? 'paused' : newStatus === 'ARCHIVED' ? 'archived' : 'moved to draft'}`);
    } catch { toastError('Failed to update status'); }
    setConfirmAction(null);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.status} disabled={loading}
              onClick={() => a.confirm ? setConfirmAction({ label: a.label, status: a.status, message: a.confirm }) : changeStatus(a.status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${a.className}`}>
              <Icon size={14} /> {a.label}
            </button>
          );
        })}
      </div>
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-surface border border-border-primary rounded-xl p-6 w-[400px] space-y-4">
            <h3 className="text-sm font-semibold">{confirmAction.label} Bot</h3>
            <p className="text-sm text-text-secondary">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={() => changeStatus(confirmAction.status)} disabled={loading}
                className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium disabled:opacity-50">{loading ? 'Updating…' : confirmAction.label}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Delete Bot (Task 10.10) ─── */
function DeleteBotAction({ bot }: { bot: Bot }) {
  const router = useRouter();
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const canDelete = usePermission('bots:create');
  const { deleteBot, loading } = useDeleteBot();
  const { success, error: toastError } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  if (!canDelete) return null;

  async function handleDelete() {
    try {
      await deleteBot(bot.id, spId);
      success('Bot deleted');
      router.push('/bots');
    } catch { toastError('Failed to delete bot'); }
  }

  return (
    <>
      <button onClick={() => setShowDialog(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-status-error border border-status-error/30 rounded-lg text-xs font-medium hover:bg-status-error/10 transition-colors">
        <Trash2 size={14} /> Delete
      </button>
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-surface border border-border-primary rounded-xl p-6 w-[420px] space-y-4">
            <h3 className="text-lg font-semibold text-status-error">Delete Bot</h3>
            <p className="text-sm text-text-secondary">
              This will permanently delete <strong>&quot;{bot.name}&quot;</strong> and all its configuration, knowledge sources, action logs, and analytics.
            </p>
            <div>
              <label className="text-xs text-text-muted">Type &quot;DELETE&quot; to confirm:</label>
              <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm mt-1 text-text-primary focus:outline-none focus:border-border-active" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowDialog(false); setConfirmText(''); }} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={handleDelete} disabled={confirmText !== 'DELETE' || loading}
                className="px-4 py-2 bg-status-error text-white rounded-lg text-sm font-medium disabled:opacity-50">{loading ? 'Deleting…' : 'Delete Bot'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Activity Log (Task 10.8) ─── */
function BotActivityLog({ botId }: { botId: string }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const [page, setPage] = useState(0);
  const limit = 25;

  const { data, loading } = useBotActionLogs({ botId, serviceProviderId: spId, limit, offset: page * limit });
  useBotActionExecutedSubscription(spId);

  const logs = data?.botActionLogs?.nodes ?? [];
  const totalCount = data?.botActionLogs?.totalCount ?? 0;

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-bg-tertiary rounded animate-pulse" />)}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity size={32} className="mx-auto text-text-muted mb-2" />
        <p className="text-text-muted text-sm">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted">{totalCount} total actions</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-text-muted border-b border-border-primary">
              <th className="text-left py-2 px-3">Time</th>
              <th className="text-left py-2 px-3">Action</th>
              <th className="text-left py-2 px-3">Tool</th>
              <th className="text-left py-2 px-3">Policy</th>
              <th className="text-left py-2 px-3">Duration</th>
              <th className="text-left py-2 px-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover/50">
                <td className="py-2 px-3 text-xs text-text-muted">{formatRelativeTime(log.createdAt)}</td>
                <td className="py-2 px-3 text-xs font-medium">{log.actionType}</td>
                <td className="py-2 px-3 text-xs font-mono text-text-secondary">{log.toolUsed || '—'}</td>
                <td className="py-2 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    log.policyDecision === 'ALLOWED' ? 'bg-status-success/10 text-status-success' :
                    log.policyDecision === 'DENIED' ? 'bg-status-error/10 text-status-error' :
                    'bg-border-secondary text-text-muted'
                  }`}>{log.policyDecision || '—'}</span>
                </td>
                <td className="py-2 px-3 text-xs text-text-muted">{log.durationMs ? `${log.durationMs}ms` : '—'}</td>
                <td className="py-2 px-3 text-xs" title={log.errorMessage ?? undefined}>{log.success ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalCount > limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">Page {page + 1} of {Math.ceil(totalCount / limit)}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="px-3 py-1.5 border border-border-secondary rounded-lg text-xs disabled:opacity-30">Prev</button>
            <button onClick={() => setPage(page + 1)} disabled={(page + 1) * limit >= totalCount}
              className="px-3 py-1.5 border border-border-secondary rounded-lg text-xs disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Configuration Tab ─── */
function ConfigTab({ botId, config }: { botId: string; config: BotConfiguration | null }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const { updateConfig, loading } = useUpdateBotConfiguration();
  const { success, error: toastError } = useToast();

  const [form, setForm] = useState({
    aiModel: config?.aiModel ?? 'gpt-4o',
    temperature: config?.temperature ?? 0.7,
    maxResponseTokens: config?.maxResponseTokens ?? 2048,
    tone: config?.tone ?? 'professional',
    writingStyle: config?.writingStyle ?? 'concise',
    contextWindowSize: config?.contextWindowSize ?? 4096,
    ragEnabled: config?.ragEnabled ?? false,
    escalationEnabled: config?.escalationEnabled ?? true,
    escalationThreshold: config?.escalationThreshold ?? 3,
  });

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    try {
      await updateConfig({ botId, serviceProviderId: spId, ...form });
      success('Configuration saved');
    } catch { toastError('Failed to save configuration'); }
  }

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Model Configuration</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-text-muted mb-1.5">AI Model</label>
          <select value={form.aiModel} onChange={(e) => update('aiModel', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          </select>
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
          <label className="block text-xs text-text-muted mb-1.5">Writing Style</label>
          <select value={form.writingStyle} onChange={(e) => update('writingStyle', e.target.value)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
            <option value="conversational">Conversational</option>
            <option value="technical">Technical</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Context Window Size</label>
          <input type="number" value={form.contextWindowSize} onChange={(e) => update('contextWindowSize', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active" />
        </div>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.ragEnabled} onChange={(e) => update('ragEnabled', e.target.checked)} className="accent-accent-purple" />
          <span className="text-sm text-text-primary">Enable RAG</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.escalationEnabled} onChange={(e) => update('escalationEnabled', e.target.checked)} className="accent-accent-purple" />
          <span className="text-sm text-text-primary">Enable Escalation</span>
        </label>
      </div>
      <button onClick={handleSave} disabled={loading}
        className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50">
        {loading ? 'Saving…' : 'Save Configuration'}
      </button>
    </div>
  );
}

/* ─── Permissions Tab ─── */
function PermissionsTab({ botId }: { botId: string }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const { data, loading: loadingPerms } = useBotPermissions(botId, spId);
  const { setPermission, loading: saving } = useSetBotPermission();
  const { success, error: toastError } = useToast();

  const permissions = data?.botPermissions ?? [];
  const enabledTools = new Set(permissions.filter((p) => p.enabled).map((p) => p.toolName));

  async function toggle(toolName: string) {
    try {
      await setPermission({ botId, serviceProviderId: spId, toolName, enabled: !enabledTools.has(toolName) });
      success(`${toolName} ${enabledTools.has(toolName) ? 'disabled' : 'enabled'}`);
    } catch { toastError('Failed to update permission'); }
  }

  if (loadingPerms) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-bg-tertiary rounded animate-pulse" />)}</div>;

  return (
    <div className="space-y-2">
      {ALLOWED_BOT_TOOLS.map((tool) => {
        const enabled = enabledTools.has(tool.name);
        return (
          <button key={tool.name} onClick={() => toggle(tool.name)} disabled={saving}
            className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
              enabled ? 'border-accent-purple/30 bg-accent-purple/5' : 'border-border-secondary hover:border-border-active'
            }`}>
            <div>
              <p className="text-sm font-medium text-text-primary">{tool.label}</p>
              <p className="text-xs text-text-muted">{tool.description}</p>
            </div>
            <div className={`w-8 h-5 rounded-full flex items-center px-0.5 transition-colors ${enabled ? 'bg-accent-purple justify-end' : 'bg-border-secondary justify-start'}`}>
              <div className="w-4 h-4 bg-white rounded-full" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main Detail Page ─── */
function BotDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';

  const { data: botData, loading, error } = useBot(id, spId);
  const { data: configData } = useBotConfiguration(id, spId);

  const [tab, setTab] = useState<TabKey>('config');

  const bot = botData?.bot;
  const config = configData?.botConfiguration ?? null;

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-10 w-64 bg-bg-tertiary rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-bg-tertiary rounded-xl animate-pulse" />)}</div>
        <div className="h-64 bg-bg-tertiary rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="p-8 text-center">
        <p className="text-status-error">{error?.message ?? 'Bot not found'}</p>
        <Link href="/bots" className="text-accent-purple text-sm hover:underline mt-2 inline-block">Back to bots</Link>
      </div>
    );
  }

  const status = getStatusConfig(bot.status);
  const a = bot.analytics;

  const tabs: { key: TabKey; label: string; icon: typeof Settings }[] = [
    { key: 'config', label: 'Configuration', icon: Settings },
    { key: 'prompt', label: 'System Prompt', icon: Code },
    { key: 'permissions', label: 'Permissions', icon: Shield },
    { key: 'workflows', label: 'Workflows (n8n)', icon: Workflow },
    { key: 'activity', label: 'Activity Log', icon: Activity },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/bots" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div className="flex items-center gap-3">
            {bot.avatarUrl ? (
              <img src={bot.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center">
                <BotIcon size={20} className="text-accent-purple" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{bot.name}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>{status.label}</span>
              </div>
              <p className="text-text-secondary text-sm mt-0.5">
                {bot.purpose}{a?.lastActiveAt ? ` · Last active ${formatRelativeTime(a.lastActiveAt)}` : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BotStatusActions bot={bot} />
          <Link href={`/bots/${id}/knowledge`} className="flex items-center gap-1.5 px-3 py-1.5 border border-border-secondary rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors">
            <Database size={14} /> Knowledge
          </Link>
          <Link href={`/bots/${id}/analytics`} className="flex items-center gap-1.5 px-3 py-1.5 border border-border-secondary rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors">
            <BarChart3 size={14} /> Analytics
          </Link>
          <DeleteBotAction bot={bot} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Conversations', value: a?.totalConversations?.toLocaleString() ?? '0' },
          { label: 'Satisfaction', value: a?.satisfactionScore != null ? `${(a.satisfactionScore * 100).toFixed(0)}%` : '—' },
          { label: 'Escalation Rate', value: a?.escalationRate != null ? `${(a.escalationRate * 100).toFixed(1)}%` : '—' },
          { label: 'Resolution Rate', value: a?.resolutionRate != null ? `${(a.resolutionRate * 100).toFixed(1)}%` : '—' },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-lg font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-accent-purple text-accent-purple' : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'config' && <ConfigTab botId={id} config={config} />}

      {tab === 'prompt' && (
        <div className="grid grid-cols-2 gap-4">
          <PromptEditor botId={id} initialPrompt={config?.customSystemPrompt ?? ''} />
          <BotTestPanel systemPrompt={config?.customSystemPrompt ?? ''} botId={id} />
        </div>
      )}

      {tab === 'permissions' && <PermissionsTab botId={id} />}

      {tab === 'workflows' && <WorkflowsTab botId={id} serviceProviderId={spId} />}

      {tab === 'activity' && <BotActivityLog botId={id} />}
    </div>
  );
}

function PromptEditor({ botId, initialPrompt }: { botId: string; initialPrompt: string }) {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const { updateConfig, loading } = useUpdateBotConfiguration();
  const { success, error: toastError } = useToast();
  const [prompt, setPrompt] = useState(initialPrompt);

  async function handleSave() {
    try {
      await updateConfig({ botId, serviceProviderId: spId, customSystemPrompt: prompt });
      success('System prompt updated');
    } catch { toastError('Failed to update prompt'); }
  }

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">System Prompt</h3>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={14}
        className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-border-active resize-none"
        placeholder="You are a helpful customer support assistant…" />
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-muted">{prompt.length} characters</p>
        <button onClick={handleSave} disabled={loading || prompt === initialPrompt}
          className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50">
          {loading ? 'Saving…' : 'Update Prompt'}
        </button>
      </div>
    </div>
  );
}

export default function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="p-8 space-y-6">
        <div className="h-10 w-64 bg-bg-tertiary rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-bg-tertiary rounded-xl animate-pulse" />)}</div>
        <div className="h-64 bg-bg-tertiary rounded-xl animate-pulse" />
      </div>
    }>
      <BotDetailContent params={params} />
    </Suspense>
  );
}
