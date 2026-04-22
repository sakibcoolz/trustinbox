'use client';

import { useState } from 'react';
import { Workflow, Plus, Trash2, ExternalLink, Loader2, Power, PowerOff } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  useBotWorkflows,
  useCreateBotWorkflow,
  useUpdateBotWorkflow,
  useDeleteBotWorkflow,
  type BotWorkflowConfig,
} from '@/lib/graphql/bots';
import { formatRelativeTime } from '@/lib/format';

const N8N_EDITOR_URL = process.env.NEXT_PUBLIC_N8N_EDITOR_URL ?? 'http://localhost:5678';

interface Props {
  botId: string;
  serviceProviderId: string;
}

export function WorkflowsTab({ botId, serviceProviderId }: Props) {
  const { data, loading, refetch } = useBotWorkflows(botId, serviceProviderId);
  const create = useCreateBotWorkflow(botId);
  const update = useUpdateBotWorkflow(botId);
  const del = useDeleteBotWorkflow(botId);
  const { success, error: toastError } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ workflowId: string; workflowName: string; webhookPath: string; description: string; isActive: boolean }>({
    workflowId: '',
    workflowName: '',
    webhookPath: '',
    description: '',
    isActive: true,
  });

  const workflows = data?.botWorkflows ?? [];

  function resetForm() {
    setForm({ workflowId: '', workflowName: '', webhookPath: '', description: '', isActive: true });
    setShowForm(false);
  }

  async function handleCreate() {
    if (!form.workflowId.trim() || !form.workflowName.trim() || !form.webhookPath.trim()) {
      toastError('Workflow ID, Name and Webhook Path are required');
      return;
    }
    if (!form.webhookPath.startsWith('/')) {
      toastError('Webhook path must start with "/"');
      return;
    }
    try {
      await create.create({
        workflowId: form.workflowId.trim(),
        workflowName: form.workflowName.trim(),
        webhookPath: form.webhookPath.trim(),
        description: form.description.trim() || undefined,
        isActive: form.isActive,
      });
      success('Workflow registered');
      resetForm();
      refetch();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to register workflow');
    }
  }

  async function toggleActive(wf: BotWorkflowConfig) {
    try {
      await update.update(wf.id, {
        workflowName: wf.workflowName,
        webhookPath: wf.webhookPath,
        description: wf.description,
        isActive: !wf.isActive,
      });
      success(`Workflow ${wf.isActive ? 'paused' : 'activated'}`);
      refetch();
    } catch {
      toastError('Failed to update workflow');
    }
  }

  async function handleDelete(wf: BotWorkflowConfig) {
    if (!window.confirm(`Remove workflow "${wf.workflowName}"?`)) return;
    try {
      await del.remove(wf.id);
      success('Workflow removed');
      refetch();
    } catch {
      toastError('Failed to remove workflow');
    }
  }

  return (
    <div className="space-y-4">
      {/* Header / banner */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-4 flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
            <Workflow size={18} className="text-accent-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">n8n Workflows</h3>
            <p className="text-xs text-text-muted mt-1 max-w-2xl">
              Register n8n webhook workflows so this bot can invoke them via the
              <code className="px-1 mx-1 text-[11px] bg-bg-input rounded">execute_workflow</code>
              tool. Make sure the corresponding workflow is <strong>Active</strong> in the n8n editor before enabling it here.
            </p>
            <a
              href={N8N_EDITOR_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-accent-purple hover:underline"
            >
              Open n8n editor <ExternalLink size={11} />
            </a>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple text-white rounded-lg text-xs font-medium hover:bg-accent-purple/90 transition-colors"
        >
          <Plus size={14} /> Add workflow
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-bg-card border border-border-primary rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold">Register a workflow</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Workflow ID *</label>
              <input
                type="text"
                value={form.workflowId}
                onChange={(e) => setForm({ ...form, workflowId: e.target.value })}
                placeholder="trustinbox-greet"
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active"
              />
              <p className="text-[10px] text-text-muted mt-1">Unique identifier the bot will reference (snake/kebab case).</p>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Display Name *</label>
              <input
                type="text"
                value={form.workflowName}
                onChange={(e) => setForm({ ...form, workflowName: e.target.value })}
                placeholder="Customer Greeting"
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-text-muted mb-1.5">n8n Webhook Path *</label>
              <input
                type="text"
                value={form.webhookPath}
                onChange={(e) => setForm({ ...form, webhookPath: e.target.value })}
                placeholder="/webhook/trustinbox-greet"
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:border-border-active"
              />
              <p className="text-[10px] text-text-muted mt-1">
                Copy from the Webhook node in n8n (Production URL). Must start with <code className="bg-bg-input px-1 rounded">/</code>.
              </p>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-text-muted mb-1.5">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this workflow does for the bot"
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active"
              />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="accent-accent-purple"
              />
              Activate immediately
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={create.loading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent-purple text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {create.loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Register
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-bg-tertiary rounded-xl animate-pulse" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-bg-card border border-border-primary rounded-xl p-8 text-center">
          <Workflow size={28} className="mx-auto text-text-muted mb-2" />
          <p className="text-sm text-text-muted">No workflows registered yet.</p>
          <p className="text-xs text-text-muted mt-1">
            Build one in n8n, copy its production webhook path, then click <strong>Add workflow</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="bg-bg-card border border-border-primary rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{wf.workflowName}</p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      wf.isActive
                        ? 'bg-status-success/10 text-status-success'
                        : 'bg-border-secondary text-text-muted'
                    }`}
                  >
                    {wf.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 font-mono truncate">
                  id: {wf.workflowId}  ·  path: {wf.webhookPath}
                </p>
                {wf.description && (
                  <p className="text-xs text-text-secondary mt-1 truncate">{wf.description}</p>
                )}
                <p className="text-[10px] text-text-muted mt-1">
                  Added {formatRelativeTime(wf.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(wf)}
                  disabled={update.loading}
                  className="p-2 rounded-lg border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
                  title={wf.isActive ? 'Pause workflow' : 'Activate workflow'}
                >
                  {wf.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(wf)}
                  disabled={del.loading}
                  className="p-2 rounded-lg border border-status-error/30 text-status-error hover:bg-status-error/10 transition-colors"
                  title="Remove workflow"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
