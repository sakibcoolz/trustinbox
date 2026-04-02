'use client';

import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';

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

// ─── Hooks (14.5) ───────────────────────────────────────────────────────────

export function useAPIKeys(serviceProviderId: string) {
  const result = useData<APIKeyConnection>(
    serviceProviderId ? `/api/gateway/v1/api-keys?serviceProviderId=${serviceProviderId}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { apiKeys: result.data } : undefined };
}

// ─── Hooks (14.6) ───────────────────────────────────────────────────────────

export function useCreateAPIKey() {
  const { run, loading, error } = useMutationHelper<APIKeyWithSecret>();
  return {
    create: (input: CreateAPIKeyInput) =>
      run('/api/gateway/v1/api-keys', 'POST', input),
    data: null as APIKeyWithSecret | null,
    loading,
    error,
  };
}

export function useRevokeAPIKey() {
  const { run, loading, error } = useMutationHelper();
  return {
    revoke: (input: RevokeAPIKeyInput) =>
      run(`/api/gateway/v1/api-keys/${input.apiKeyId}/revoke`, 'POST', input),
    loading,
    error,
  };
}

// ─── Hooks (14.7) ───────────────────────────────────────────────────────────

export function useIntegrationConfigs(serviceProviderId: string) {
  const result = useData<IntegrationConfig[]>(
    serviceProviderId ? `/api/gateway/v1/integrations?serviceProviderId=${serviceProviderId}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { integrationConfigs: result.data } : undefined };
}

// ─── Hooks (14.3) ───────────────────────────────────────────────────────────

export function useIntegrationLogs(
  serviceProviderId: string,
  options?: { integration?: string; status?: string; limit?: number; offset?: number },
) {
  const params = new URLSearchParams({ serviceProviderId });
  if (options?.integration) params.set('integration', options.integration);
  if (options?.status) params.set('status', options.status);
  params.set('limit', String(options?.limit ?? 25));
  params.set('offset', String(options?.offset ?? 0));
  const qs = params.toString();

  const result = useData<IntegrationLogConnection>(
    serviceProviderId ? `/api/gateway/v1/integrations/logs?${qs}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { integrationLogs: result.data } : undefined };
}

// ─── Hooks (14.4) ───────────────────────────────────────────────────────────

export function useRateLimitInfo(serviceProviderId: string) {
  const result = useData<RateLimitInfo>(
    serviceProviderId ? `/api/gateway/v1/rate-limits?serviceProviderId=${serviceProviderId}` : null,
    { skip: !serviceProviderId },
  );
  return { ...result, data: result.data ? { rateLimitInfo: result.data } : undefined };
}
