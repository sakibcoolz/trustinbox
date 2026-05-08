import { serverFetch, transformKeys } from '@/lib/server-fetch';
import type {
  Bot,
  BotActionLog,
  AgentDelegationLog,
  KnowledgeSource,
  KnowledgeChunk,
  ConversationAIInsights,
} from '@/lib/types';

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// Gateway returns a minimal bot row: {id, name, avatarUrl, purpose, department,
// status, createdAt, updatedAt}. Adapt it into the richer UI Bot type by
// filling AI-only fields with sensible defaults until the gateway grows them.
function adaptBot(raw: Record<string, unknown>): Bot {
  const r = transformKeys(raw) as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    name: String(r.name ?? ''),
    description: (r.description as string | undefined) ?? (r.purpose as string | undefined),
    status: (r.status as Bot['status']) ?? 'DRAFT',
    agentType: (r.agentType as Bot['agentType']) ?? 'MANAGER',
    managerBotId: r.managerBotId as string | undefined,
    model: (r.model as string) ?? 'gpt-4',
    provider: (r.provider as string) ?? 'openai',
    totalInteractions: Number(r.totalInteractions ?? 0),
    lastActiveAt: r.lastActiveAt as string | undefined,
    createdAt: String(r.createdAt ?? ''),
    updatedAt: String(r.updatedAt ?? ''),
  };
}

// ─── Bots ────────────────────────────────────────────────

export async function fetchBots(opts?: { status?: string; agentType?: string }): Promise<Bot[]> {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/bots${qs(opts ?? {})}`);
    const d = transformKeys(data) as { nodes?: unknown[]; bots?: unknown[] } | unknown[];
    const list = Array.isArray(d) ? d : (d.nodes ?? d.bots ?? []);
    return (list as Record<string, unknown>[]).map(adaptBot);
  } catch {
    return MOCK_BOTS;
  }
}

export async function fetchBot(id: string): Promise<Bot | null> {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/bots/${encodeURIComponent(id)}`);
    return adaptBot(data);
  } catch {
    return MOCK_BOTS.find((b) => b.id === id) ?? null;
  }
}

export async function fetchAgentSuite(managerBotId: string): Promise<Bot[]> {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/bots/agent-suite`);
    const d = transformKeys(data) as { subAgents?: unknown[]; bots?: unknown[] };
    const list = (d.subAgents ?? d.bots ?? []) as Record<string, unknown>[];
    return list.map(adaptBot);
  } catch {
    return MOCK_BOTS.filter((b) => b.managerBotId === managerBotId);
  }
}

// ─── Knowledge ───────────────────────────────────────────

export async function fetchKnowledgeSources(opts?: { botId?: string }): Promise<KnowledgeSource[]> {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/ai/knowledge${qs(opts ?? {})}`);
    const d = transformKeys(data) as { sources?: KnowledgeSource[] } | KnowledgeSource[];
    return Array.isArray(d) ? d : d.sources ?? [];
  } catch {
    return opts?.botId ? MOCK_SOURCES.filter((s) => s.botId === opts.botId) : MOCK_SOURCES;
  }
}

export async function queryKnowledge(opts: {
  botId: string;
  query: string;
  topK?: number;
  minScore?: number;
}): Promise<KnowledgeChunk[]> {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/ai/knowledge/query`, {
      method: 'POST',
      body: JSON.stringify(opts),
    });
    const d = transformKeys(data) as { chunks?: KnowledgeChunk[] } | KnowledgeChunk[];
    return Array.isArray(d) ? d : d.chunks ?? [];
  } catch {
    return MOCK_CHUNKS;
  }
}

// ─── Audit ───────────────────────────────────────────────

export async function fetchActionLogs(opts?: {
  botId?: string;
  toolName?: string;
  policyDecision?: string;
  threadId?: string;
  success?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: BotActionLog[]; total: number }> {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/ai/audit${qs(opts ?? {})}`);
    const d = transformKeys(data) as { logs?: BotActionLog[]; total?: number };
    return { logs: d.logs ?? [], total: d.total ?? 0 };
  } catch {
    let logs = MOCK_ACTION_LOGS;
    if (opts?.botId) logs = logs.filter((l) => l.botId === opts.botId);
    if (opts?.threadId) logs = logs.filter((l) => l.threadId === opts.threadId);
    if (opts?.toolName) logs = logs.filter((l) => l.toolUsed === opts.toolName);
    if (opts?.policyDecision) logs = logs.filter((l) => l.policyDecision === opts.policyDecision);
    if (opts?.success !== undefined) logs = logs.filter((l) => l.success === opts.success);
    return { logs, total: logs.length };
  }
}

export async function fetchActionLog(id: string): Promise<BotActionLog | null> {
  try {
    const data = await serverFetch<Record<string, unknown>>(`/api/v1/ai/audit/${encodeURIComponent(id)}`);
    return transformKeys(data) as BotActionLog;
  } catch {
    return MOCK_ACTION_LOGS.find((l) => l.id === id) ?? null;
  }
}

export async function fetchDelegationsForThread(threadId: string): Promise<AgentDelegationLog[]> {
  try {
    const data = await serverFetch<Record<string, unknown>>(
      `/api/v1/ai/delegations${qs({ threadId })}`,
    );
    const d = transformKeys(data) as { delegations?: AgentDelegationLog[] };
    return d.delegations ?? [];
  } catch {
    return MOCK_DELEGATIONS.filter((d) => d.threadId === threadId);
  }
}

// ─── Conversation Insights ───────────────────────────────

export async function fetchConversationInsights(
  conversationId: string,
): Promise<ConversationAIInsights | null> {
  try {
    const data = await serverFetch<Record<string, unknown>>(
      `/api/v1/ai/conversations/${encodeURIComponent(conversationId)}/insights`,
    );
    return transformKeys(data) as ConversationAIInsights;
  } catch {
    return {
      conversationId,
      summary: 'Customer asked about appointment availability and payment options. Bot scheduled a call-back for the following Tuesday after escalating payment questions to the Payments sub-agent.',
      summaryGeneratedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      detectedCategories: ['SERVICE_PROVIDER', 'APPOINTMENT'],
      spamScore: 0.04,
      botActionCount: 7,
      lastBotActionAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    };
  }
}

// ─── Mock Data (used until gateway endpoints land) ───────

const MOCK_BOTS: Bot[] = [
  {
    id: 'bot-mgr-1',
    name: 'Front-Desk Manager',
    description: 'Triages every incoming conversation and delegates to specialists.',
    status: 'ACTIVE',
    agentType: 'MANAGER',
    model: 'gpt-4',
    provider: 'openai',
    totalInteractions: 1284,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'bot-cs-1',
    name: 'Customer Service Agent',
    description: 'Answers FAQs and routes complex issues to humans.',
    status: 'ACTIVE',
    agentType: 'CUSTOMER_SERVICE',
    managerBotId: 'bot-mgr-1',
    model: 'gpt-4',
    provider: 'openai',
    totalInteractions: 842,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'bot-appt-1',
    name: 'Appointment Scheduler',
    description: 'Books, reschedules, and cancels appointments.',
    status: 'ACTIVE',
    agentType: 'APPOINTMENT_SCHEDULING',
    managerBotId: 'bot-mgr-1',
    model: 'gpt-3.5-turbo',
    provider: 'openai',
    totalInteractions: 312,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 17).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'bot-pay-1',
    name: 'Payments Specialist',
    description: 'Handles payment questions and escalations.',
    status: 'PAUSED',
    agentType: 'PAYMENT',
    managerBotId: 'bot-mgr-1',
    model: 'claude-3-sonnet',
    provider: 'anthropic',
    totalInteractions: 90,
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

const MOCK_SOURCES: KnowledgeSource[] = [
  {
    id: 'ks-1',
    botId: 'bot-cs-1',
    name: 'Product FAQ v3.pdf',
    type: 'PDF',
    status: 'READY',
    chunkCount: 142,
    embeddingModel: 'text-embedding-3-small',
    collectionName: 'trustinbox_bot_bot-cs-1',
    sizeBytes: 248_000,
    lastIndexedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'ks-2',
    botId: 'bot-cs-1',
    name: 'Support Playbook.md',
    type: 'MARKDOWN',
    status: 'READY',
    chunkCount: 58,
    embeddingModel: 'text-embedding-3-small',
    collectionName: 'trustinbox_bot_bot-cs-1',
    sizeBytes: 32_000,
    lastIndexedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'ks-3',
    botId: 'bot-appt-1',
    name: 'Booking Hours.txt',
    type: 'TEXT',
    status: 'INDEXING',
    chunkCount: 0,
    embeddingModel: 'text-embedding-3-small',
    collectionName: 'trustinbox_bot_bot-appt-1',
    sizeBytes: 4_200,
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
];

const MOCK_CHUNKS: KnowledgeChunk[] = [
  {
    chunkId: 'c-1',
    sourceId: 'ks-1',
    sourceName: 'Product FAQ v3.pdf',
    content: 'Refund requests must be submitted within 30 days of purchase. Provide the order ID and reason for refund...',
    relevanceScore: 0.92,
    metadata: { page: '12' },
  },
  {
    chunkId: 'c-2',
    sourceId: 'ks-1',
    sourceName: 'Product FAQ v3.pdf',
    content: 'Payment methods accepted include Visa, MasterCard, and American Express. We do not currently accept...',
    relevanceScore: 0.81,
    metadata: { page: '7' },
  },
  {
    chunkId: 'c-3',
    sourceId: 'ks-2',
    sourceName: 'Support Playbook.md',
    content: 'Escalate to a human agent when (1) the customer expresses frustration twice in a single thread, (2) ...',
    relevanceScore: 0.74,
    metadata: { section: 'Escalation' },
  },
];

const sharedThread = 't-thread-001';
const MOCK_ACTION_LOGS: BotActionLog[] = [
  {
    id: 'log-1',
    botId: 'bot-mgr-1',
    serviceProviderId: 'sp-acme',
    conversationId: 'conv-9001',
    threadId: sharedThread,
    userId: 'u-1',
    actionType: 'classify',
    toolUsed: 'route_intent',
    inputSummary: 'Customer message about [EMAIL] regarding payment',
    outputSummary: 'Routed to PAYMENT sub-agent (confidence 0.91)',
    policyDecision: 'ALLOW',
    durationMs: 412,
    success: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: 'log-2',
    botId: 'bot-pay-1',
    serviceProviderId: 'sp-acme',
    conversationId: 'conv-9001',
    threadId: sharedThread,
    userId: 'u-1',
    actionType: 'tool_call',
    toolUsed: 'lookup_invoice',
    inputSummary: '{"customer":"u-1","contact":"[PHONE]"}',
    outputSummary: '{"invoice_id":"INV-1124","balance":120.00}',
    policyDecision: 'ALLOW',
    durationMs: 218,
    success: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'log-3',
    botId: 'bot-pay-1',
    serviceProviderId: 'sp-acme',
    conversationId: 'conv-9001',
    threadId: sharedThread,
    userId: 'u-1',
    actionType: 'tool_call',
    toolUsed: 'send_payment_link',
    inputSummary: '{"amount":120.00,"customer":"u-1"}',
    outputSummary: 'denied: customer opt-out for ADVERTISEMENT category',
    policyDecision: 'DENY',
    policyReason: 'User has opted out of ADVERTISEMENT category notifications',
    durationMs: 95,
    success: false,
    errorMessage: 'policy denied',
    createdAt: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
  },
  {
    id: 'log-4',
    botId: 'bot-appt-1',
    serviceProviderId: 'sp-acme',
    conversationId: 'conv-9012',
    threadId: 't-thread-002',
    userId: 'u-2',
    actionType: 'tool_call',
    toolUsed: 'book_appointment',
    inputSummary: '{"date":"2026-05-04","time":"10:00","email":"[EMAIL]"}',
    outputSummary: '{"appointment_id":"APT-882","confirmed":true}',
    policyDecision: 'ALLOW',
    durationMs: 540,
    success: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

const MOCK_DELEGATIONS: AgentDelegationLog[] = [
  {
    id: 'del-1',
    managerBotId: 'bot-mgr-1',
    targetBotId: 'bot-pay-1',
    userId: 'u-1',
    conversationId: 'conv-9001',
    serviceProviderId: 'sp-acme',
    threadId: sharedThread,
    delegationDepth: 0,
    intentDetected: 'payment_inquiry',
    confidenceScore: 0.91,
    inputSummary: 'Customer asking about outstanding balance for [EMAIL]',
    outputSummary: 'Delegated to PAYMENT specialist',
    durationMs: 38,
    success: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 13).toISOString(),
  },
  {
    id: 'del-2',
    managerBotId: 'bot-pay-1',
    targetBotId: 'bot-cs-1',
    userId: 'u-1',
    conversationId: 'conv-9001',
    serviceProviderId: 'sp-acme',
    threadId: sharedThread,
    delegationDepth: 1,
    intentDetected: 'general_question',
    confidenceScore: 0.62,
    inputSummary: 'Customer also asking about account closure procedure',
    outputSummary: 'Delegated to CUSTOMER_SERVICE for FAQ lookup',
    durationMs: 52,
    success: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
  },
];
