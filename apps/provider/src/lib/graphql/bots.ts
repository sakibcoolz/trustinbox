import { gql, useQuery, useLazyQuery, useMutation, useSubscription } from '@apollo/client';

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
] as const;

// ─── Fragments ───────────────────────────────────────────────────────────────

export const BOT_FIELDS = gql`
  fragment BotFields on Bot {
    id
    serviceProviderId
    name
    avatarUrl
    purpose
    department
    industryProfileId
    status
    createdAt
    updatedAt
  }
`;

export const BOT_WITH_ANALYTICS = gql`
  fragment BotWithAnalytics on Bot {
    ...BotFields
    analytics {
      botId
      totalConversations
      totalMessagesSent
      totalMessagesReceived
      totalActionsExecuted
      totalEscalations
      avgResponseTimeMs
      escalationRate
      resolutionRate
      satisfactionScore
      lastActiveAt
    }
  }
  ${BOT_FIELDS}
`;

export const BOT_CONFIGURATION_FIELDS = gql`
  fragment BotConfigurationFields on BotConfiguration {
    botId
    serviceProviderId
    aiModel
    customSystemPrompt
    tone
    writingStyle
    maxResponseTokens
    contextWindowSize
    ragEnabled
    ragTopK
    ragScoreThreshold
    escalationEnabled
    escalationThreshold
    escalationTopics
    handoffMessage
    temperature
  }
`;

export const BOT_PERMISSION_FIELDS = gql`
  fragment BotPermissionFields on BotPermission {
    id
    botId
    toolName
    enabled
    constraintsJson
  }
`;

export const KNOWLEDGE_SOURCE_FIELDS = gql`
  fragment KnowledgeSourceFields on KnowledgeSource {
    id
    botId
    name
    description
    sourceType
    content
    s3Key
    fileType
    fileSize
    chunkCount
    status
    createdAt
  }
`;

export const BOT_ACTION_LOG_FIELDS = gql`
  fragment BotActionLogFields on BotActionLog {
    id
    botId
    conversationId
    userId
    actionType
    toolUsed
    inputSummary
    outputSummary
    policyDecision
    policyReason
    durationMs
    success
    errorMessage
    createdAt
  }
`;

// ─── Queries ─────────────────────────────────────────────────────────────────

export const GET_BOTS = gql`
  query GetBots($serviceProviderId: ID!, $status: BotStatus, $limit: Int, $offset: Int) {
    bots(serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
      nodes {
        ...BotWithAnalytics
      }
      totalCount
    }
  }
  ${BOT_WITH_ANALYTICS}
`;

export const GET_BOT = gql`
  query GetBot($id: ID!, $serviceProviderId: ID!) {
    bot(id: $id, serviceProviderId: $serviceProviderId) {
      ...BotWithAnalytics
      configuration {
        ...BotConfigurationFields
      }
    }
  }
  ${BOT_WITH_ANALYTICS}
  ${BOT_CONFIGURATION_FIELDS}
`;

export const GET_BOT_CONFIGURATION = gql`
  query GetBotConfiguration($botId: ID!, $serviceProviderId: ID!) {
    botConfiguration(botId: $botId, serviceProviderId: $serviceProviderId) {
      ...BotConfigurationFields
    }
  }
  ${BOT_CONFIGURATION_FIELDS}
`;

export const GET_BOT_PERMISSIONS = gql`
  query GetBotPermissions($botId: ID!, $serviceProviderId: ID!) {
    botPermissions(botId: $botId, serviceProviderId: $serviceProviderId) {
      ...BotPermissionFields
    }
  }
  ${BOT_PERMISSION_FIELDS}
`;

export const GET_BOT_KNOWLEDGE_SOURCES = gql`
  query GetBotKnowledgeSources($botId: ID!, $serviceProviderId: ID!) {
    botKnowledgeSources(botId: $botId, serviceProviderId: $serviceProviderId) {
      ...KnowledgeSourceFields
    }
  }
  ${KNOWLEDGE_SOURCE_FIELDS}
`;

export const GET_BOT_ACTION_LOGS = gql`
  query GetBotActionLogs($botId: ID!, $serviceProviderId: ID!, $conversationId: ID, $limit: Int, $offset: Int) {
    botActionLogs(botId: $botId, serviceProviderId: $serviceProviderId, conversationId: $conversationId, limit: $limit, offset: $offset) {
      nodes {
        ...BotActionLogFields
      }
      totalCount
    }
  }
  ${BOT_ACTION_LOG_FIELDS}
`;

export const GET_BOT_ANALYTICS = gql`
  query GetBotAnalytics($botId: ID!, $serviceProviderId: ID!) {
    botAnalytics(botId: $botId, serviceProviderId: $serviceProviderId) {
      botId
      totalConversations
      totalMessagesSent
      totalMessagesReceived
      totalActionsExecuted
      totalEscalations
      avgResponseTimeMs
      escalationRate
      resolutionRate
      satisfactionScore
      lastActiveAt
    }
  }
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

export const CREATE_BOT = gql`
  mutation CreateBot($input: CreateBotInput!) {
    createBot(input: $input) {
      ...BotFields
    }
  }
  ${BOT_FIELDS}
`;

export const UPDATE_BOT = gql`
  mutation UpdateBot($input: UpdateBotInput!) {
    updateBot(input: $input) {
      ...BotWithAnalytics
    }
  }
  ${BOT_WITH_ANALYTICS}
`;

export const DELETE_BOT = gql`
  mutation DeleteBot($botId: ID!, $serviceProviderId: ID!) {
    deleteBot(botId: $botId, serviceProviderId: $serviceProviderId)
  }
`;

export const UPDATE_BOT_CONFIGURATION = gql`
  mutation UpdateBotConfiguration($input: UpdateBotConfigurationInput!) {
    updateBotConfiguration(input: $input) {
      ...BotConfigurationFields
    }
  }
  ${BOT_CONFIGURATION_FIELDS}
`;

export const SET_BOT_PERMISSION = gql`
  mutation SetBotPermission($input: SetBotPermissionInput!) {
    setBotPermission(input: $input) {
      ...BotPermissionFields
    }
  }
  ${BOT_PERMISSION_FIELDS}
`;

export const ADD_KNOWLEDGE_SOURCE = gql`
  mutation AddKnowledgeSource($input: AddKnowledgeSourceInput!) {
    addKnowledgeSource(input: $input) {
      ...KnowledgeSourceFields
    }
  }
  ${KNOWLEDGE_SOURCE_FIELDS}
`;

export const REMOVE_KNOWLEDGE_SOURCE = gql`
  mutation RemoveKnowledgeSource($knowledgeSourceId: ID!, $botId: ID!, $serviceProviderId: ID!) {
    removeKnowledgeSource(knowledgeSourceId: $knowledgeSourceId, botId: $botId, serviceProviderId: $serviceProviderId)
  }
`;

export const EXECUTE_BOT_ACTION = gql`
  mutation ExecuteBotAction($input: ExecuteBotActionInput!) {
    executeBotAction(input: $input) {
      success
      outputJson
      policyDecision
      policyReason
      escalated
    }
  }
`;

// ─── Subscription ────────────────────────────────────────────────────────────

export const PROVIDER_BOT_ACTION_EXECUTED = gql`
  subscription ProviderBotActionExecuted($serviceProviderId: ID!) {
    providerBotActionExecuted(serviceProviderId: $serviceProviderId) {
      ...BotActionLogFields
    }
  }
  ${BOT_ACTION_LOG_FIELDS}
`;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useBots(variables: { serviceProviderId: string; status?: BotStatus | null; limit?: number; offset?: number }) {
  return useQuery<{ bots: BotConnection }>(GET_BOTS, {
    variables: { limit: 50, offset: 0, ...variables },
    skip: !variables.serviceProviderId,
  });
}

export function useBot(id: string, serviceProviderId: string) {
  return useQuery<{ bot: Bot }>(GET_BOT, {
    variables: { id, serviceProviderId },
    skip: !id || !serviceProviderId,
  });
}

export function useBotConfiguration(botId: string, serviceProviderId: string) {
  return useQuery<{ botConfiguration: BotConfiguration }>(GET_BOT_CONFIGURATION, {
    variables: { botId, serviceProviderId },
    skip: !botId || !serviceProviderId,
  });
}

export function useBotPermissions(botId: string, serviceProviderId: string) {
  return useQuery<{ botPermissions: BotPermission[] }>(GET_BOT_PERMISSIONS, {
    variables: { botId, serviceProviderId },
    skip: !botId || !serviceProviderId,
  });
}

export function useBotKnowledgeSources(botId: string, serviceProviderId: string) {
  return useQuery<{ botKnowledgeSources: KnowledgeSource[] }>(GET_BOT_KNOWLEDGE_SOURCES, {
    variables: { botId, serviceProviderId },
    skip: !botId || !serviceProviderId,
  });
}

export function useBotActionLogs(variables: { botId: string; serviceProviderId: string; conversationId?: string; limit?: number; offset?: number }) {
  return useQuery<{ botActionLogs: BotActionLogConnection }>(GET_BOT_ACTION_LOGS, {
    variables: { limit: 25, offset: 0, ...variables },
    skip: !variables.botId || !variables.serviceProviderId,
  });
}

export function useBotAnalytics(botId: string, serviceProviderId: string) {
  return useQuery<{ botAnalytics: BotAnalytics }>(GET_BOT_ANALYTICS, {
    variables: { botId, serviceProviderId },
    skip: !botId || !serviceProviderId,
  });
}

export function useCreateBot() {
  const [mutate, result] = useMutation(CREATE_BOT, {
    refetchQueries: ['GetBots'],
  });
  return {
    create: (input: CreateBotInput) => mutate({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useUpdateBot() {
  const [mutate, result] = useMutation(UPDATE_BOT, {
    refetchQueries: ['GetBots'],
  });
  return {
    update: (input: UpdateBotInput) => mutate({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useDeleteBot() {
  const [mutate, result] = useMutation(DELETE_BOT, {
    refetchQueries: ['GetBots'],
  });
  return {
    deleteBot: (botId: string, serviceProviderId: string) => mutate({ variables: { botId, serviceProviderId } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useUpdateBotConfiguration() {
  const [mutate, result] = useMutation(UPDATE_BOT_CONFIGURATION);
  return {
    updateConfig: (input: UpdateBotConfigurationInput) => mutate({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useSetBotPermission() {
  const [mutate, result] = useMutation(SET_BOT_PERMISSION, {
    refetchQueries: ['GetBotPermissions'],
  });
  return {
    setPermission: (input: SetBotPermissionInput) => mutate({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useAddKnowledgeSource() {
  const [mutate, result] = useMutation(ADD_KNOWLEDGE_SOURCE, {
    refetchQueries: ['GetBotKnowledgeSources'],
  });
  return {
    addSource: (input: AddKnowledgeSourceInput) => mutate({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useRemoveKnowledgeSource() {
  const [mutate, result] = useMutation(REMOVE_KNOWLEDGE_SOURCE, {
    refetchQueries: ['GetBotKnowledgeSources'],
  });
  return {
    removeSource: (knowledgeSourceId: string, botId: string, serviceProviderId: string) =>
      mutate({ variables: { knowledgeSourceId, botId, serviceProviderId } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useExecuteBotAction() {
  const [mutate, result] = useMutation<{ executeBotAction: ExecuteBotActionResult }>(EXECUTE_BOT_ACTION);
  return {
    execute: (input: ExecuteBotActionInput) => mutate({ variables: { input } }),
    loading: result.loading,
    error: result.error,
    data: result.data?.executeBotAction ?? null,
  };
}

export function useBotActionExecutedSubscription(serviceProviderId: string) {
  return useSubscription<{ providerBotActionExecuted: BotActionLog }>(PROVIDER_BOT_ACTION_EXECUTED, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
  });
}
