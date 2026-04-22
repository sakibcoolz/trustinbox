import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';
import { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BotStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type KnowledgeSourceType = 'DOCUMENT' | 'URL' | 'TEXT' | 'FAQ' | 'API';
export type KnowledgeSourceStatus = 'PENDING' | 'PROCESSING' | 'ACTIVE_SOURCE' | 'FAILED';

export interface BotAnalytics {
  botId: string;
  totalConversations: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalActionsExecuted: number;
  totalEscalations: number;
  avgResponseTimeMs: number;
  escalationRate: number;
  resolutionRate: number;
  satisfactionScore: number;
  lastActiveAt: string | null;
}

export interface BotConfiguration {
  botId: string;
  serviceProviderId: string;
  aiModel: string;
  customSystemPrompt: string;
  tone: string;
  writingStyle: string;
  maxResponseTokens: number;
  contextWindowSize: number;
  ragEnabled: boolean;
  ragTopK: number;
  ragScoreThreshold: number;
  escalationEnabled: boolean;
  escalationThreshold: number;
  escalationTopics: string[];
  handoffMessage: string;
  temperature: number | null;
}

export interface Bot {
  id: string;
  serviceProviderId: string;
  name: string;
  avatarUrl?: string;
  purpose: string;
  department?: string;
  industryProfileId?: string;
  status: BotStatus;
  configuration?: BotConfiguration;
  analytics?: BotAnalytics;
  createdAt: string;
  updatedAt: string;
}

export interface BotConnection {
  nodes: Bot[];
  totalCount: number;
}

export interface CreateBotInput {
  serviceProviderId: string;
  name: string;
  purpose: string;
  description?: string;
  department?: string;
  industryProfileId?: string;
  avatarUrl?: string;
}

export interface UpdateBotInput {
  botId: string;
  serviceProviderId: string;
  name?: string;
  purpose?: string;
  description?: string;
  department?: string;
  avatarUrl?: string;
  status?: BotStatus;
}

export interface UpdateBotConfigurationInput {
  botId: string;
  serviceProviderId: string;
  aiModel?: string;
  customSystemPrompt?: string;
  tone?: string;
  writingStyle?: string;
  maxResponseTokens?: number;
  contextWindowSize?: number;
  ragEnabled?: boolean;
  ragTopK?: number;
  ragScoreThreshold?: number;
  escalationEnabled?: boolean;
  escalationThreshold?: number;
  escalationTopics?: string[];
  handoffMessage?: string;
  temperature?: number;
}

export interface BotPermission {
  id: string;
  botId: string;
  toolName: string;
  enabled: boolean;
  constraintsJson: string | null;
}

export interface SetBotPermissionInput {
  botId: string;
  serviceProviderId: string;
  toolName: string;
  enabled: boolean;
  constraintsJson?: string;
}

export interface KnowledgeSource {
  id: string;
  botId: string;
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
  content?: string;
  s3Key?: string;
  fileType?: string;
  fileSize?: number;
  chunkCount: number;
  status: KnowledgeSourceStatus;
  createdAt: string;
}

export interface AddKnowledgeSourceInput {
  botId: string;
  serviceProviderId: string;
  name: string;
  description?: string;
  sourceType: KnowledgeSourceType;
  content?: string;
  s3Key?: string;
  fileType?: string;
  fileSize?: number;
}

export interface BotActionLog {
  id: string;
  botId: string;
  conversationId?: string;
  userId?: string;
  actionType: string;
  toolUsed?: string;
  inputSummary?: string;
  outputSummary?: string;
  policyDecision?: string;
  policyReason?: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface BotActionLogConnection {
  nodes: BotActionLog[];
  totalCount: number;
}

export interface ExecuteBotActionInput {
  botId: string;
  serviceProviderId: string;
  conversationId?: string;
  actionType: string;
  toolName?: string;
  inputJson?: string;
}

export interface ExecuteBotActionResult {
  success: boolean;
  outputJson?: string;
  policyDecision?: string;
  policyReason?: string;
  escalated: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getStatusConfig(status: BotStatus) {
  const map: Record<BotStatus, { label: string; className: string }> = {
    ACTIVE: { label: 'Active', className: 'bg-status-success/20 text-status-success' },
    DRAFT: { label: 'Draft', className: 'bg-text-muted/20 text-text-muted' },
    PAUSED: { label: 'Paused', className: 'bg-status-warning/20 text-status-warning' },
    ARCHIVED: { label: 'Archived', className: 'bg-border-secondary text-text-muted' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

export function getKnowledgeSourceStatusConfig(status: KnowledgeSourceStatus) {
  const map: Record<KnowledgeSourceStatus, { label: string; className: string }> = {
    ACTIVE_SOURCE: { label: 'Indexed', className: 'bg-status-success/20 text-status-success' },
    PROCESSING: { label: 'Processing', className: 'bg-status-warning/20 text-status-warning' },
    PENDING: { label: 'Pending', className: 'bg-text-muted/20 text-text-muted' },
    FAILED: { label: 'Error', className: 'bg-status-error/20 text-status-error' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

export function getKnowledgeSourceTypeConfig(type: KnowledgeSourceType) {
  const map: Record<KnowledgeSourceType, { label: string }> = {
    DOCUMENT: { label: 'Document' },
    URL: { label: 'Web URL' },
    TEXT: { label: 'Text' },
    FAQ: { label: 'FAQ' },
    API: { label: 'API' },
  };
  return map[type] ?? { label: type };
}

export const ALLOWED_BOT_TOOLS = [
  { name: 'get_customer_profile', label: 'View Customer Profile', description: 'Access customer data and history' },
  { name: 'search_knowledge_base', label: 'Search Knowledge Base', description: 'Search indexed knowledge sources' },
  { name: 'evaluate_policy', label: 'Evaluate Policy', description: 'Check communication policies' },
  { name: 'send_notification', label: 'Send Notification', description: 'Send notifications to customers' },
  { name: 'schedule_callback', label: 'Schedule Callback', description: 'Schedule callback appointments' },
  { name: 'share_document', label: 'Share Document', description: 'Share documents with customers' },
  { name: 'create_ticket', label: 'Create Ticket', description: 'Create support tickets' },
  { name: 'update_ticket', label: 'Update Ticket', description: 'Update existing tickets' },
  { name: 'escalate_to_human', label: 'Escalate to Human', description: 'Hand off to a human agent' },
  { name: 'check_account_status', label: 'Check Account Status', description: 'View account balance and status' },
  { name: 'execute_workflow', label: 'Execute n8n Workflow', description: 'Trigger registered n8n workflows for custom automations' },
] as const;

// ─── Workflow integration (n8n) ─────────────────────────────────────────────

export interface BotWorkflowConfig {
  id: string;
  botId: string;
  workflowId: string;
  workflowName: string;
  webhookPath: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBotWorkflowInput {
  workflowId: string;
  workflowName: string;
  webhookPath: string;
  description?: string;
  isActive: boolean;
}

export interface UpdateBotWorkflowInput {
  workflowName?: string;
  webhookPath?: string;
  description?: string;
  isActive: boolean;
}

// ─── Query Hooks ─────────────────────────────────────────────────────────────

export function useBots(variables: { serviceProviderId: string; status?: BotStatus | null; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (variables.status) params.set('status', variables.status);
  if (variables.limit) params.set('limit', String(variables.limit));
  if (variables.offset) params.set('offset', String(variables.offset));
  const q = params.toString() ? `?${params}` : '';
  const url = variables.serviceProviderId ? `/api/bots${q}` : null;
  const result = useData<BotConnection>(url, { skip: !variables.serviceProviderId, deps: [variables.status, variables.limit, variables.offset] });
  return { ...result, data: result.data ? { bots: result.data } : undefined };
}

export function useBot(id: string, serviceProviderId: string) {
  const url = id && serviceProviderId ? `/api/bots/${id}` : null;
  const result = useData<Bot>(url, { skip: !id || !serviceProviderId });
  return { ...result, data: result.data ? { bot: result.data } : undefined };
}

export function useBotConfiguration(botId: string, serviceProviderId: string) {
  const url = botId && serviceProviderId ? `/api/bots/${botId}/config` : null;
  const result = useData<BotConfiguration>(url, { skip: !botId || !serviceProviderId });
  return { ...result, data: result.data ? { botConfiguration: result.data } : undefined };
}

export function useBotPermissions(botId: string, serviceProviderId: string) {
  const url = botId && serviceProviderId ? `/api/gateway/v1/bots/${botId}/permissions` : null;
  const result = useData<BotPermission[]>(url, { skip: !botId || !serviceProviderId });
  return { ...result, data: result.data ? { botPermissions: result.data } : undefined };
}

export function useBotKnowledgeSources(botId: string, serviceProviderId: string) {
  const url = botId && serviceProviderId ? `/api/gateway/v1/bots/${botId}/knowledge` : null;
  const result = useData<KnowledgeSource[]>(url, { skip: !botId || !serviceProviderId });
  return { ...result, data: result.data ? { botKnowledgeSources: result.data } : undefined };
}

export function useBotActionLogs(variables: { botId: string; serviceProviderId: string; conversationId?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (variables.limit) params.set('limit', String(variables.limit));
  if (variables.offset) params.set('offset', String(variables.offset));
  if (variables.conversationId) params.set('conversationId', variables.conversationId);
  const q = params.toString() ? `?${params}` : '';
  const url = variables.botId && variables.serviceProviderId ? `/api/bots/${variables.botId}/actions${q}` : null;
  const result = useData<BotActionLogConnection>(url, { skip: !variables.botId || !variables.serviceProviderId, deps: [variables.limit, variables.offset] });
  return { ...result, data: result.data ? { botActionLogs: result.data } : undefined };
}

export function useBotAnalytics(botId: string, serviceProviderId: string) {
  const url = botId && serviceProviderId ? `/api/analytics/bots?botId=${botId}` : null;
  const result = useData<BotAnalytics>(url, { skip: !botId || !serviceProviderId });
  return { ...result, data: result.data ? { botAnalytics: result.data } : undefined };
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

export function useCreateBot() {
  const { run, loading, error } = useMutationHelper<Bot>();
  return {
    create: (input: CreateBotInput) => run('/api/bots', 'POST', input),
    loading,
    error,
  };
}

export function useUpdateBot() {
  const { run, loading, error } = useMutationHelper<Bot>();
  return {
    update: (input: UpdateBotInput) => run(`/api/bots/${input.botId}`, 'PUT', input),
    loading,
    error,
  };
}

export function useDeleteBot() {
  const { run, loading, error } = useMutationHelper();
  return {
    deleteBot: (botId: string, _serviceProviderId: string) => run(`/api/bots/${botId}`, 'DELETE'),
    loading,
    error,
  };
}

export function useUpdateBotConfiguration() {
  const { run, loading, error } = useMutationHelper<BotConfiguration>();
  return {
    updateConfig: (input: UpdateBotConfigurationInput) => run(`/api/bots/${input.botId}/config`, 'PUT', input),
    loading,
    error,
  };
}

export function useSetBotPermission() {
  const { run, loading, error } = useMutationHelper<BotPermission>();
  return {
    setPermission: (input: SetBotPermissionInput) => run(`/api/gateway/v1/bots/${input.botId}/permissions`, 'POST', input),
    loading,
    error,
  };
}

export function useAddKnowledgeSource() {
  const { run, loading, error } = useMutationHelper<KnowledgeSource>();
  return {
    addSource: (input: AddKnowledgeSourceInput) => run(`/api/gateway/v1/bots/${input.botId}/knowledge`, 'POST', input),
    loading,
    error,
  };
}

export function useRemoveKnowledgeSource() {
  const { run, loading, error } = useMutationHelper();
  return {
    removeSource: (knowledgeSourceId: string, botId: string, _serviceProviderId: string) =>
      run(`/api/gateway/v1/bots/${botId}/knowledge/${knowledgeSourceId}`, 'DELETE'),
    loading,
    error,
  };
}

export function useExecuteBotAction() {
  const { run, loading, error } = useMutationHelper<ExecuteBotActionResult>();
  const [data, setData] = useState<ExecuteBotActionResult | null>(null);
  return {
    execute: async (input: ExecuteBotActionInput) => {
      const result = await run(`/api/bots/${input.botId}/actions`, 'POST', input);
      setData(result);
      return result;
    },
    loading,
    error,
    data,
  };
}

// ─── Subscription Hooks (replaced by SSE in Phase 4) ─────────────────────────

export function useBotActionExecutedSubscription(_serviceProviderId: string) {
  return { data: undefined };
}

// ─── Workflow hooks ─────────────────────────────────────────────────────────

export function useBotWorkflows(botId: string, serviceProviderId: string) {
  const url = botId && serviceProviderId ? `/api/gateway/v1/bots/${botId}/workflows` : null;
  const result = useData<BotWorkflowConfig[]>(url, { skip: !botId || !serviceProviderId });
  return { ...result, data: result.data ? { botWorkflows: result.data } : undefined };
}

export function useCreateBotWorkflow(botId: string) {
  const { run, loading, error } = useMutationHelper<BotWorkflowConfig>();
  return {
    create: (input: CreateBotWorkflowInput) =>
      run(`/api/gateway/v1/bots/${botId}/workflows`, 'POST', input),
    loading,
    error,
  };
}

export function useUpdateBotWorkflow(botId: string) {
  const { run, loading, error } = useMutationHelper<BotWorkflowConfig>();
  return {
    update: (configId: string, input: UpdateBotWorkflowInput) =>
      run(`/api/gateway/v1/bots/${botId}/workflows/${configId}`, 'PUT', input),
    loading,
    error,
  };
}

export function useDeleteBotWorkflow(botId: string) {
  const { run, loading, error } = useMutationHelper();
  return {
    remove: (configId: string) =>
      run(`/api/gateway/v1/bots/${botId}/workflows/${configId}`, 'DELETE'),
    loading,
    error,
  };
}
