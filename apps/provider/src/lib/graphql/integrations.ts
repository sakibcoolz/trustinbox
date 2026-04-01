import { gql, useQuery, useMutation } from '@apollo/client';

// ─── Types (14.5) ───────────────────────────────────────────────────────────

export interface APIKey {
  id: string;
  serviceProviderId: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface APIKeyWithSecret {
  apiKey: APIKey;
  secret: string;
}

export interface APIKeyConnection {
  nodes: APIKey[];
  totalCount: number;
}

export interface CreateAPIKeyInput {
  serviceProviderId: string;
  name: string;
  scopes: string[];
  expiresInDays?: number;
}

export interface RevokeAPIKeyInput {
  apiKeyId: string;
  serviceProviderId: string;
}

// ─── Types (14.7) ───────────────────────────────────────────────────────────

export type IntegrationStatus = 'CONNECTED' | 'NOT_CONNECTED' | 'COMING_SOON' | 'ERROR';

export interface IntegrationConfig {
  name: string;
  status: IntegrationStatus;
  config?: Record<string, unknown>;
  lastSyncAt?: string;
  errorMessage?: string;
}

export function getIntegrationStatusConfig(status: IntegrationStatus) {
  const map: Record<IntegrationStatus, { label: string; className: string }> = {
    CONNECTED: { label: 'Connected', className: 'bg-status-success/10 text-status-success' },
    NOT_CONNECTED: { label: 'Not Connected', className: 'bg-border-secondary text-text-muted' },
    COMING_SOON: { label: 'Coming Soon', className: 'bg-accent-blue/10 text-accent-blue' },
    ERROR: { label: 'Error', className: 'bg-status-error/10 text-status-error' },
  };
  return map[status] ?? map.NOT_CONNECTED;
}

// ─── Types (14.3) ───────────────────────────────────────────────────────────

export type IntegrationLogStatus = 'SUCCESS' | 'ERROR' | 'WARNING';

export interface IntegrationLogEntry {
  id: string;
  integration: string;
  event: string;
  status: IntegrationLogStatus;
  details: string;
  timestamp: string;
}

export interface IntegrationLogConnection {
  nodes: IntegrationLogEntry[];
  totalCount: number;
}

export function getLogStatusConfig(status: IntegrationLogStatus) {
  const map: Record<IntegrationLogStatus, { label: string; className: string }> = {
    SUCCESS: { label: 'Success', className: 'bg-status-success/10 text-status-success' },
    ERROR: { label: 'Error', className: 'bg-status-error/10 text-status-error' },
    WARNING: { label: 'Warning', className: 'bg-status-warning/10 text-status-warning' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

// ─── Types (14.4) ───────────────────────────────────────────────────────────

export interface RateLimitInfo {
  currentUsage: number;
  limit: number;
  resetsAt: string;
  scopeBreakdown?: { scope: string; usage: number; limit: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getAPIKeyStatus(key: APIKey): { label: string; className: string } {
  if (key.scopes.length === 0 && !key.expiresAt && !key.lastUsedAt) {
    // Revoked keys would be filtered server side or have a flag; use prefix heuristic
  }
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return { label: 'Expired', className: 'bg-status-warning/10 text-status-warning' };
  }
  return { label: 'Active', className: 'bg-status-success/10 text-status-success' };
}

export const API_KEY_SCOPES = [
  'read:notifications',
  'write:notifications',
  'read:callbacks',
  'write:callbacks',
  'read:campaigns',
  'write:campaigns',
  'read:conversations',
  'read:analytics',
] as const;

export const EXPIRY_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: '1 year', value: 365 },
  { label: 'Never', value: 0 },
] as const;

// ─── Fragments ───────────────────────────────────────────────────────────────

export const API_KEY_FIELDS = gql`
  fragment APIKeyFields on APIKey {
    id
    serviceProviderId
    name
    prefix
    scopes
    expiresAt
    lastUsedAt
    createdAt
  }
`;

// ─── Queries (14.5) ─────────────────────────────────────────────────────────

export const GET_API_KEYS = gql`
  ${API_KEY_FIELDS}
  query GetAPIKeys($serviceProviderId: ID!) {
    apiKeys(serviceProviderId: $serviceProviderId) {
      nodes {
        ...APIKeyFields
      }
      totalCount
    }
  }
`;

// ─── Queries (14.7) ─────────────────────────────────────────────────────────

export const GET_INTEGRATION_CONFIGS = gql`
  query GetIntegrationConfigs($serviceProviderId: ID!) {
    integrationConfigs(serviceProviderId: $serviceProviderId) {
      name
      status
      config
      lastSyncAt
      errorMessage
    }
  }
`;

// ─── Queries (14.3) ─────────────────────────────────────────────────────────

export const GET_INTEGRATION_LOGS = gql`
  query GetIntegrationLogs($serviceProviderId: ID!, $integration: String, $status: String, $limit: Int, $offset: Int) {
    integrationLogs(serviceProviderId: $serviceProviderId, integration: $integration, status: $status, limit: $limit, offset: $offset) {
      nodes {
        id
        integration
        event
        status
        details
        timestamp
      }
      totalCount
    }
  }
`;

// ─── Queries (14.4) ─────────────────────────────────────────────────────────

export const GET_RATE_LIMIT_INFO = gql`
  query GetRateLimitInfo($serviceProviderId: ID!) {
    rateLimitInfo(serviceProviderId: $serviceProviderId) {
      currentUsage
      limit
      resetsAt
      scopeBreakdown {
        scope
        usage
        limit
      }
    }
  }
`;

// ─── Mutations (14.6) ───────────────────────────────────────────────────────

export const CREATE_API_KEY = gql`
  ${API_KEY_FIELDS}
  mutation CreateAPIKey($input: CreateAPIKeyInput!) {
    createAPIKey(input: $input) {
      apiKey {
        ...APIKeyFields
      }
      secret
    }
  }
`;

export const REVOKE_API_KEY = gql`
  mutation RevokeAPIKey($input: RevokeAPIKeyInput!) {
    revokeAPIKey(input: $input)
  }
`;

// ─── Hooks (14.5) ───────────────────────────────────────────────────────────

export function useAPIKeys(serviceProviderId: string) {
  return useQuery<{ apiKeys: APIKeyConnection }>(GET_API_KEYS, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

// ─── Hooks (14.6) ───────────────────────────────────────────────────────────

export function useCreateAPIKey() {
  const [create, result] = useMutation<{ createAPIKey: APIKeyWithSecret }>(CREATE_API_KEY, {
    refetchQueries: ['GetAPIKeys'],
  });
  return {
    create: (input: CreateAPIKeyInput) => create({ variables: { input } }),
    data: result.data?.createAPIKey ?? null,
    loading: result.loading,
    error: result.error,
  };
}

export function useRevokeAPIKey() {
  const [revoke, result] = useMutation(REVOKE_API_KEY, {
    refetchQueries: ['GetAPIKeys'],
  });
  return {
    revoke: (input: RevokeAPIKeyInput) => revoke({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

// ─── Hooks (14.7) ───────────────────────────────────────────────────────────

export function useIntegrationConfigs(serviceProviderId: string) {
  return useQuery<{ integrationConfigs: IntegrationConfig[] }>(GET_INTEGRATION_CONFIGS, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

// ─── Hooks (14.3) ───────────────────────────────────────────────────────────

export function useIntegrationLogs(
  serviceProviderId: string,
  options?: { integration?: string; status?: string; limit?: number; offset?: number },
) {
  return useQuery<{ integrationLogs: IntegrationLogConnection }>(GET_INTEGRATION_LOGS, {
    variables: {
      serviceProviderId,
      integration: options?.integration,
      status: options?.status,
      limit: options?.limit ?? 25,
      offset: options?.offset ?? 0,
    },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000, // auto-refresh every 30s
  });
}

// ─── Hooks (14.4) ───────────────────────────────────────────────────────────

export function useRateLimitInfo(serviceProviderId: string) {
  return useQuery<{ rateLimitInfo: RateLimitInfo }>(GET_RATE_LIMIT_INFO, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60000, // refresh every minute
  });
}
