export async function fetchAPIKeys() {
  return [];
}

export async function fetchIntegrationConfigs() {
  return [];
}

export async function fetchIntegrationLogs(_opts?: {
  integration?: string; status?: string; limit?: number; offset?: number;
}) {
  return [];
}

export async function fetchRateLimitInfo() {
  return { limit: 100, remaining: 100, resetAt: '' };
}
