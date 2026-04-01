import { gql, useQuery, useMutation } from '@apollo/client';

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
// FRAGMENTS
// ============================================================

export const TEAM_MEMBER_FRAGMENT = gql`
  fragment TeamMemberFields on TeamMember {
    id
    userId
    serviceProviderId
    username
    email
    fullName
    role
    status
    createdAt
  }
`;

export const TEAM_INVITATION_FRAGMENT = gql`
  fragment TeamInvitationFields on TeamInvitation {
    id
    email
    serviceProviderId
    role
    status
    invitedBy
    expiresAt
    createdAt
  }
`;

export const INDUSTRY_PROFILE_FRAGMENT = gql`
  fragment IndustryProfileFields on IndustryProfile {
    id
    industryKey
    displayName
    description
    defaultCategories
    complianceHintsJson
    documentTypesJson
    callbackWorkflowsJson
    botPromptPackJson
    dashboardPresetsJson
    analyticsPresetsJson
    isActive
    createdAt
    updatedAt
  }
`;

// ============================================================
// QUERIES — Team Management (15.11)
// ============================================================

export const GET_TEAM_MEMBERS = gql`
  ${TEAM_MEMBER_FRAGMENT}
  query GetTeamMembers($serviceProviderId: ID!, $limit: Int, $offset: Int) {
    teamMembers(serviceProviderId: $serviceProviderId, limit: $limit, offset: $offset) {
      items {
        ...TeamMemberFields
      }
      total
    }
  }
`;

export const GET_PENDING_INVITATIONS = gql`
  ${TEAM_INVITATION_FRAGMENT}
  query GetPendingInvitations($serviceProviderId: ID!, $limit: Int, $offset: Int) {
    pendingInvitations(serviceProviderId: $serviceProviderId, limit: $limit, offset: $offset) {
      items {
        ...TeamInvitationFields
      }
      total
    }
  }
`;

// ============================================================
// MUTATIONS — Team Management (15.10)
// ============================================================

export const INVITE_TEAM_MEMBER = gql`
  mutation InviteTeamMember($input: InviteTeamMemberInput!) {
    inviteTeamMember(input: $input) {
      invitationId
    }
  }
`;

export const ACCEPT_INVITATION = gql`
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token)
  }
`;

export const REVOKE_INVITATION = gql`
  mutation RevokeInvitation($invitationId: ID!, $serviceProviderId: ID!) {
    revokeInvitation(invitationId: $invitationId, serviceProviderId: $serviceProviderId)
  }
`;

export const CHANGE_TEAM_MEMBER_ROLE = gql`
  mutation ChangeTeamMemberRole($input: ChangeTeamMemberRoleInput!) {
    changeTeamMemberRole(input: $input)
  }
`;

export const REMOVE_TEAM_MEMBER = gql`
  mutation RemoveTeamMember($input: RemoveTeamMemberInput!) {
    removeTeamMember(input: $input)
  }
`;

// ============================================================
// QUERIES — Industry Profiles (15.12)
// ============================================================

export const GET_INDUSTRY_PROFILE = gql`
  ${INDUSTRY_PROFILE_FRAGMENT}
  query GetIndustryProfile($industryKey: String!) {
    industryProfile(industryKey: $industryKey) {
      ...IndustryProfileFields
    }
  }
`;

export const GET_INDUSTRY_PROFILES = gql`
  ${INDUSTRY_PROFILE_FRAGMENT}
  query GetIndustryProfiles($activeOnly: Boolean, $limit: Int, $offset: Int) {
    industryProfiles(activeOnly: $activeOnly, limit: $limit, offset: $offset) {
      nodes {
        ...IndustryProfileFields
      }
      totalCount
    }
  }
`;

// ============================================================
// QUERIES — Organization Profile (15.13)
// ============================================================

export const GET_ORGANIZATION_PROFILE = gql`
  query GetOrganizationProfile($serviceProviderId: ID!) {
    serviceProvider(id: $serviceProviderId) {
      id
      slug
      name
      legalName
      industry
      description
      verificationStatus
      status
      website
    }
  }
`;

// Aspirational — org profile extended fields not yet in schema
export const UPDATE_ORGANIZATION_PROFILE = gql`
  mutation UpdateOrganizationProfile($input: UpdateOrganizationProfileInput!) {
    updateOrganizationProfile(input: $input) {
      id
      name
      displayName
      description
      website
      contactEmail
      supportPhone
      address
      logoUrl
      primaryColor
      notificationFooter
    }
  }
`;

// Aspirational — team activity log
export const GET_TEAM_ACTIVITY = gql`
  query GetTeamActivity($serviceProviderId: ID!, $limit: Int, $offset: Int) {
    teamActivity(serviceProviderId: $serviceProviderId, limit: $limit, offset: $offset) {
      items {
        id
        type
        actorName
        targetName
        description
        metadata
        createdAt
      }
      total
    }
  }
`;

// ============================================================
// HOOKS — Team Management
// ============================================================

export function useTeamMembers(spId: string) {
  return useQuery<{
    teamMembers: { items: TeamMember[]; total: number };
  }>(GET_TEAM_MEMBERS, {
    variables: { serviceProviderId: spId },
    skip: !spId,
    fetchPolicy: 'cache-and-network',
  });
}

export function usePendingInvitations(spId: string) {
  return useQuery<{
    pendingInvitations: { items: TeamInvitation[]; total: number };
  }>(GET_PENDING_INVITATIONS, {
    variables: { serviceProviderId: spId },
    skip: !spId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useInviteTeamMember(spId: string) {
  const [mutate, { loading, error }] = useMutation(INVITE_TEAM_MEMBER, {
    refetchQueries: [
      { query: GET_TEAM_MEMBERS, variables: { serviceProviderId: spId } },
      { query: GET_PENDING_INVITATIONS, variables: { serviceProviderId: spId } },
    ],
  });
  return {
    inviteTeamMember: (email: string, role: TeamRole) =>
      mutate({ variables: { input: { serviceProviderId: spId, email, role } } }),
    loading,
    error,
  };
}

export function useRevokeInvitation(spId: string) {
  const [mutate, { loading, error }] = useMutation(REVOKE_INVITATION, {
    refetchQueries: [
      { query: GET_PENDING_INVITATIONS, variables: { serviceProviderId: spId } },
    ],
  });
  return {
    revokeInvitation: (invitationId: string) =>
      mutate({ variables: { invitationId, serviceProviderId: spId } }),
    loading,
    error,
  };
}

export function useChangeTeamMemberRole(spId: string) {
  const [mutate, { loading, error }] = useMutation(CHANGE_TEAM_MEMBER_ROLE, {
    refetchQueries: [
      { query: GET_TEAM_MEMBERS, variables: { serviceProviderId: spId } },
    ],
  });
  return {
    changeRole: (targetUserId: string, newRole: TeamRole) =>
      mutate({ variables: { input: { serviceProviderId: spId, targetUserId, newRole } } }),
    loading,
    error,
  };
}

export function useRemoveTeamMember(spId: string) {
  const [mutate, { loading, error }] = useMutation(REMOVE_TEAM_MEMBER, {
    refetchQueries: [
      { query: GET_TEAM_MEMBERS, variables: { serviceProviderId: spId } },
      { query: GET_PENDING_INVITATIONS, variables: { serviceProviderId: spId } },
    ],
  });
  return {
    removeMember: (targetUserId: string) =>
      mutate({ variables: { input: { serviceProviderId: spId, targetUserId } } }),
    loading,
    error,
  };
}

// ============================================================
// HOOKS — Industry Profiles
// ============================================================

export function useIndustryProfile(key: string) {
  return useQuery<{
    industryProfile: IndustryProfile;
  }>(GET_INDUSTRY_PROFILE, {
    variables: { industryKey: key },
    skip: !key,
    fetchPolicy: 'cache-and-network',
  });
}

export function useIndustryProfiles(activeOnly = true) {
  return useQuery<{
    industryProfiles: { nodes: IndustryProfile[]; totalCount: number };
  }>(GET_INDUSTRY_PROFILES, {
    variables: { activeOnly },
    fetchPolicy: 'cache-and-network',
  });
}

// ============================================================
// HOOKS — Organization Profile
// ============================================================

export function useOrganizationProfile(spId: string) {
  return useQuery<{
    serviceProvider: OrganizationProfile;
  }>(GET_ORGANIZATION_PROFILE, {
    variables: { serviceProviderId: spId },
    skip: !spId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useUpdateOrganizationProfile(spId: string) {
  const [mutate, { loading, error }] = useMutation(UPDATE_ORGANIZATION_PROFILE, {
    refetchQueries: [
      { query: GET_ORGANIZATION_PROFILE, variables: { serviceProviderId: spId } },
    ],
  });
  return {
    updateProfile: (input: Record<string, unknown>) =>
      mutate({ variables: { input: { serviceProviderId: spId, ...input } } }),
    loading,
    error,
  };
}

// ============================================================
// HOOKS — Team Activity
// ============================================================

export function useTeamActivity(spId: string) {
  return useQuery<{
    teamActivity: { items: TeamActivityEntry[]; total: number };
  }>(GET_TEAM_ACTIVITY, {
    variables: { serviceProviderId: spId, limit: 20 },
    skip: !spId,
    fetchPolicy: 'cache-and-network',
  });
}
