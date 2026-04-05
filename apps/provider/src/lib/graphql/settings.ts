'use client';

import { useData } from '@/lib/hooks/useData';
import { useMutationHelper } from '@/lib/hooks/useMutationHelper';

// ============================================================
// TYPES
// ============================================================

export type TeamRole = 'SP_ADMIN' | 'AGENT' | 'ANALYST';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface TeamMember {
  id: string;
  userId: string;
  serviceProviderId: string;
  username: string;
  email: string;
  fullName: string;
  role: TeamRole;
  status: string;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  serviceProviderId: string;
  role: TeamRole;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface IndustryProfile {
  id: string;
  industryKey: string;
  displayName: string;
  description?: string;
  defaultCategories: string[];
  complianceHintsJson?: string;
  documentTypesJson?: string;
  callbackWorkflowsJson?: string;
  botPromptPackJson?: string;
  dashboardPresetsJson?: string;
  analyticsPresetsJson?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  legalName?: string;
  displayName?: string;
  industry: string;
  description?: string;
  website?: string;
  verificationStatus: string;
  status: string;
  serviceMode: string;
  contactEmail?: string;
  supportPhone?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  notificationFooter?: string;
}

export type TeamActivityType = 'MEMBER_INVITED' | 'INVITATION_ACCEPTED' | 'ROLE_CHANGED' | 'MEMBER_REMOVED' | 'LOGIN';

export interface TeamActivityEntry {
  id: string;
  type: TeamActivityType;
  actorName: string;
  targetName?: string;
  description: string;
  metadata?: string;
  createdAt: string;
}

// ============================================================
// HELPERS
// ============================================================

export const ROLE_LABELS: Record<TeamRole, string> = {
  SP_ADMIN: 'Admin',
  AGENT: 'Agent',
  ANALYST: 'Analyst',
};

export const ROLE_COLORS: Record<TeamRole, string> = {
  SP_ADMIN: 'bg-accent-purple/10 text-accent-purple',
  AGENT: 'bg-accent-blue/10 text-accent-blue',
  ANALYST: 'bg-border-secondary text-text-muted',
};

export const INVITATION_STATUS_COLORS: Record<InvitationStatus, string> = {
  PENDING: 'bg-status-warning/10 text-status-warning',
  ACCEPTED: 'bg-status-success/10 text-status-success',
  EXPIRED: 'bg-status-error/10 text-status-error',
  REVOKED: 'bg-border-secondary text-text-muted',
};

export function getActivityIcon(type: TeamActivityType): { icon: string; color: string } {
  switch (type) {
    case 'MEMBER_INVITED': return { icon: '📨', color: 'bg-accent-blue' };
    case 'INVITATION_ACCEPTED': return { icon: '✅', color: 'bg-status-success' };
    case 'ROLE_CHANGED': return { icon: '🔄', color: 'bg-accent-purple' };
    case 'MEMBER_REMOVED': return { icon: '🚪', color: 'bg-status-error' };
    case 'LOGIN': return { icon: '🔑', color: 'bg-text-muted' };
    default: return { icon: '•', color: 'bg-text-muted' };
  }
}

export function safeParseJson<T = unknown>(json: string | undefined | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ============================================================
// HOOKS — Team Management
// ============================================================

export function useTeamMembers(spId: string) {
  const result = useData<{ items: TeamMember[]; total: number }>(
    spId ? `/api/team/members?serviceProviderId=${spId}` : null,
    { skip: !spId },
  );
  return { ...result, data: result.data ? { teamMembers: result.data } : undefined };
}

export function usePendingInvitations(spId: string) {
  const result = useData<{ items: TeamInvitation[]; total: number }>(
    spId ? `/api/team/invitations?serviceProviderId=${spId}` : null,
    { skip: !spId },
  );
  return { ...result, data: result.data ? { pendingInvitations: result.data } : undefined };
}

export function useInviteTeamMember(spId: string) {
  const { run, loading, error } = useMutationHelper<{ invitationId: string }>();
  return {
    inviteTeamMember: (email: string, role: TeamRole) =>
      run('/api/team/invitations', 'POST', { serviceProviderId: spId, email, role }),
    loading,
    error,
  };
}

export function useRevokeInvitation(spId: string) {
  const { run, loading, error } = useMutationHelper();
  return {
    revokeInvitation: (invitationId: string) =>
      run(`/api/team/invitations/revoke`, 'POST', { invitationId, serviceProviderId: spId }),
    loading,
    error,
  };
}

export function useChangeTeamMemberRole(spId: string) {
  const { run, loading, error } = useMutationHelper();
  return {
    changeRole: (targetUserId: string, newRole: TeamRole) =>
      run('/api/team/members/role', 'PATCH', { serviceProviderId: spId, targetUserId, newRole }),
    loading,
    error,
  };
}

export function useRemoveTeamMember(spId: string) {
  const { run, loading, error } = useMutationHelper();
  return {
    removeMember: (targetUserId: string) =>
      run('/api/team/members/role', 'DELETE', { serviceProviderId: spId, targetUserId }),
    loading,
    error,
  };
}

// ============================================================
// HOOKS — Industry Profiles
// ============================================================

export function useIndustryProfile(key: string) {
  const result = useData<IndustryProfile>(
    key ? `/api/gateway/v1/industry-profiles/${key}` : null,
    { skip: !key },
  );
  return { ...result, data: result.data ? { industryProfile: result.data } : undefined };
}

export function useIndustryProfiles(activeOnly = true) {
  const result = useData<{ nodes: IndustryProfile[]; totalCount: number }>(
    `/api/gateway/v1/industry-profiles?activeOnly=${activeOnly}`,
  );
  return { ...result, data: result.data ? { industryProfiles: result.data } : undefined };
}

// ============================================================
// HOOKS — Organization Profile
// ============================================================

export function useOrganizationProfile(spId: string) {
  const result = useData<OrganizationProfile>(
    spId ? `/api/gateway/v1/service-providers/${spId}` : null,
    { skip: !spId },
  );
  return { ...result, data: result.data ? { serviceProvider: result.data } : undefined };
}

export function useUpdateOrganizationProfile(spId: string) {
  const { run, loading, error } = useMutationHelper<OrganizationProfile>();
  return {
    updateProfile: (input: Record<string, unknown>) =>
      run(`/api/gateway/v1/service-providers/${spId}`, 'PUT', { serviceProviderId: spId, ...input }),
    loading,
    error,
  };
}

export function useApplyIndustryProfile(spId: string) {
  const { run, loading, error } = useMutationHelper();
  return {
    applyProfile: (industryKey: string) =>
      run(`/api/gateway/v1/service-providers/${spId}`, 'PUT', { serviceProviderId: spId, industry: industryKey }),
    loading,
    error,
  };
}

export function useSaveCommunicationOverrides(spId: string) {
  const { run, loading, error } = useMutationHelper();
  return {
    saveOverrides: (overrides: Record<string, unknown>) =>
      run(`/api/gateway/v1/service-providers/${spId}/communication-config`, 'PUT', { serviceProviderId: spId, ...overrides }),
    loading,
    error,
  };
}

// ============================================================
// HOOKS — Team Activity
// ============================================================

export function useTeamActivity(spId: string) {
  const result = useData<{ items: TeamActivityEntry[]; total: number }>(
    spId ? `/api/gateway/v1/team-activity?serviceProviderId=${spId}&limit=20` : null,
    { skip: !spId },
  );
  return { ...result, data: result.data ? { teamActivity: result.data } : undefined };
}
