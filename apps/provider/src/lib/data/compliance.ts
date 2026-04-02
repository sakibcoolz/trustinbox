export async function fetchAuditLogs(_opts?: {
  from?: string; to?: string; actorId?: string; actionType?: string; limit?: number; offset?: number;
}) {
  return [];
}

export async function fetchComplianceStatus() {
  return { verified: true, kycStatus: 'APPROVED', lastReviewedAt: new Date().toISOString() };
}

export async function fetchPolicyDecisionLogs(_opts?: {
  from?: string; to?: string; result?: string; category?: string; limit?: number; offset?: number;
}) {
  return [];
}

export async function fetchSpamReports(_opts?: { status?: string; limit?: number; offset?: number }) {
  return [];
}

export async function fetchSpamReportSummary() {
  return { total: 0, pending: 0, resolved: 0, dismissed: 0 };
}
