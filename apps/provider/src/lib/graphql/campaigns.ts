import { gql, useQuery, useLazyQuery, useMutation, useSubscription } from '@apollo/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CampaignStatus = 'DRAFT_CAMPAIGN' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED';
export type NotificationCategory = 'PERSONAL' | 'ORGANIZATIONAL' | 'ADVERTISEMENT';

export interface Campaign {
  id: string;
  serviceProviderId: string;
  name: string;
  description?: string;
  category: NotificationCategory;
  status: CampaignStatus;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignConnection {
  nodes: Campaign[];
  totalCount: number;
}

export interface CreateCampaignInput {
  serviceProviderId: string;
  name: string;
  description?: string;
  category: NotificationCategory;
  scheduledAt?: string | null;
}

export interface UpdateCampaignInput {
  campaignId: string;
  serviceProviderId: string;
  name?: string;
  description?: string;
  scheduledAt?: string | null;
}

export interface CampaignAnalytics {
  totalTargets: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalSkipped: number;
  deliveryRate: number;
  readRate: number;
}

export interface PolicyBlockReason {
  decisionCode: string;
  reason: string;
  count: number;
}

export interface CampaignPolicyPreview {
  totalTargets: number;
  allowedCount: number;
  blockedCount: number;
  blockedReasons: PolicyBlockReason[];
}

export type CampaignTargetStatus = 'PENDING' | 'POLICY_CHECKING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED';

export interface CampaignTarget {
  id: string;
  userId: string;
  status: CampaignTargetStatus;
  policyDecision?: string;
  policyReason?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failedReason?: string;
}

export interface CampaignTargetConnection {
  nodes: CampaignTarget[];
  totalCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getStatusConfig(status: CampaignStatus) {
  const map: Record<CampaignStatus, { label: string; className: string }> = {
    DRAFT_CAMPAIGN: { label: 'Draft', className: 'bg-border-secondary text-text-muted' },
    SCHEDULED: { label: 'Scheduled', className: 'bg-accent-blue/10 text-accent-blue' },
    RUNNING: { label: 'Active', className: 'bg-status-success/10 text-status-success' },
    COMPLETED: { label: 'Completed', className: 'bg-accent-purple/10 text-accent-purple' },
    CANCELLED: { label: 'Cancelled', className: 'bg-status-error/10 text-status-error' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

export function getCategoryConfig(category: NotificationCategory) {
  const map: Record<NotificationCategory, { label: string; className: string }> = {
    PERSONAL: { label: 'Personal', className: 'bg-accent-blue/10 text-accent-blue' },
    ORGANIZATIONAL: { label: 'Organizational', className: 'bg-accent-purple/10 text-accent-purple' },
    ADVERTISEMENT: { label: 'Advertisement', className: 'bg-accent-orange/10 text-accent-orange' },
  };
  return map[category] ?? { label: category, className: 'bg-border-secondary text-text-muted' };
}

export function getTargetStatusConfig(status: CampaignTargetStatus) {
  const map: Record<CampaignTargetStatus, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-border-secondary text-text-muted' },
    POLICY_CHECKING: { label: 'Checking', className: 'bg-accent-orange/10 text-accent-orange' },
    SENT: { label: 'Sent', className: 'bg-accent-blue/10 text-accent-blue' },
    DELIVERED: { label: 'Delivered', className: 'bg-status-success/10 text-status-success' },
    READ: { label: 'Read', className: 'bg-accent-purple/10 text-accent-purple' },
    FAILED: { label: 'Failed', className: 'bg-status-error/10 text-status-error' },
    SKIPPED: { label: 'Skipped', className: 'bg-border-secondary text-text-muted' },
  };
  return map[status] ?? { label: status, className: 'bg-border-secondary text-text-muted' };
}

// ─── Fragments ───────────────────────────────────────────────────────────────

export const CAMPAIGN_FIELDS = gql`
  fragment CampaignFields on Campaign {
    id
    serviceProviderId
    name
    description
    category
    status
    targetCount
    sentCount
    deliveredCount
    readCount
    failedCount
    scheduledAt
    startedAt
    completedAt
    createdAt
    updatedAt
  }
`;

// ─── Queries ─────────────────────────────────────────────────────────────────

export const GET_CAMPAIGNS = gql`
  ${CAMPAIGN_FIELDS}
  query GetCampaigns($serviceProviderId: ID!, $status: CampaignStatus, $limit: Int, $offset: Int) {
    campaigns(serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
      nodes {
        ...CampaignFields
      }
      totalCount
    }
  }
`;

export const GET_CAMPAIGN = gql`
  ${CAMPAIGN_FIELDS}
  query GetCampaign($id: ID!, $serviceProviderId: ID!) {
    campaign(id: $id, serviceProviderId: $serviceProviderId) {
      ...CampaignFields
    }
  }
`;

export const GET_CAMPAIGN_ANALYTICS = gql`
  query GetCampaignAnalytics($serviceProviderId: ID!, $campaignId: ID!, $from: DateTime!, $to: DateTime!) {
    campaignAnalytics(serviceProviderId: $serviceProviderId, campaignId: $campaignId, from: $from, to: $to) {
      totalTargets
      totalSent
      totalDelivered
      totalRead
      totalFailed
      totalSkipped
      deliveryRate
      readRate
    }
  }
`;

export const GET_CAMPAIGN_TARGETS = gql`
  query GetCampaignTargets($campaignId: ID!, $serviceProviderId: ID!, $status: CampaignTargetStatus, $limit: Int, $offset: Int) {
    campaignTargets(campaignId: $campaignId, serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
      nodes {
        id
        userId
        status
        policyDecision
        policyReason
        sentAt
        deliveredAt
        readAt
        failedReason
      }
      totalCount
    }
  }
`;

export const PREVIEW_CAMPAIGN_POLICY = gql`
  query PreviewCampaignPolicy($input: PreviewCampaignPolicyInput!) {
    previewCampaignPolicy(input: $input) {
      totalTargets
      allowedCount
      blockedCount
      blockedReasons {
        decisionCode
        reason
        count
      }
    }
  }
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

export const CREATE_CAMPAIGN = gql`
  ${CAMPAIGN_FIELDS}
  mutation CreateCampaign($input: CreateCampaignInput!) {
    createCampaign(input: $input) {
      ...CampaignFields
    }
  }
`;

export const UPDATE_CAMPAIGN = gql`
  ${CAMPAIGN_FIELDS}
  mutation UpdateCampaign($input: UpdateCampaignInput!) {
    updateCampaign(input: $input) {
      ...CampaignFields
    }
  }
`;

export const LAUNCH_CAMPAIGN = gql`
  ${CAMPAIGN_FIELDS}
  mutation LaunchCampaign($campaignId: ID!, $serviceProviderId: ID!) {
    launchCampaign(campaignId: $campaignId, serviceProviderId: $serviceProviderId) {
      ...CampaignFields
    }
  }
`;

export const CANCEL_CAMPAIGN = gql`
  mutation CancelCampaign($campaignId: ID!, $serviceProviderId: ID!) {
    cancelCampaign(campaignId: $campaignId, serviceProviderId: $serviceProviderId)
  }
`;

// ─── Subscription ────────────────────────────────────────────────────────────

export const CAMPAIGN_PROGRESS_SUBSCRIPTION = gql`
  ${CAMPAIGN_FIELDS}
  subscription CampaignProgressUpdated($serviceProviderId: ID!) {
    providerCampaignProgressUpdated(serviceProviderId: $serviceProviderId) {
      ...CampaignFields
    }
  }
`;

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useCampaigns(variables: { serviceProviderId: string; status?: CampaignStatus | null; limit?: number; offset?: number }) {
  return useQuery<{ campaigns: CampaignConnection }>(GET_CAMPAIGNS, {
    variables: { limit: 25, offset: 0, ...variables },
    skip: !variables.serviceProviderId,
  });
}

export function useCampaign(id: string, serviceProviderId: string) {
  return useQuery<{ campaign: Campaign }>(GET_CAMPAIGN, {
    variables: { id, serviceProviderId },
    skip: !id || !serviceProviderId,
  });
}

export function useCampaignAnalytics(variables: { serviceProviderId: string; campaignId: string; from: string; to: string }, skip?: boolean) {
  return useQuery<{ campaignAnalytics: CampaignAnalytics }>(GET_CAMPAIGN_ANALYTICS, {
    variables,
    skip: skip || !variables.campaignId,
  });
}

export function useCampaignTargets(variables: { campaignId: string; serviceProviderId: string; status?: CampaignTargetStatus | null; limit?: number; offset?: number }) {
  return useQuery<{ campaignTargets: CampaignTargetConnection }>(GET_CAMPAIGN_TARGETS, {
    variables: { limit: 25, offset: 0, ...variables },
    skip: !variables.campaignId,
  });
}

export function usePreviewCampaignPolicy() {
  const [preview, { data, loading, error }] = useLazyQuery<{ previewCampaignPolicy: CampaignPolicyPreview }>(PREVIEW_CAMPAIGN_POLICY);
  return {
    preview: (input: { serviceProviderId: string; category: NotificationCategory; targetUserIds: string[] }) =>
      preview({ variables: { input } }),
    result: data?.previewCampaignPolicy ?? null,
    loading,
    error,
  };
}

export function useCreateCampaign() {
  const [create, result] = useMutation(CREATE_CAMPAIGN, {
    refetchQueries: ['GetCampaigns'],
  });
  return {
    create: (input: CreateCampaignInput) => create({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useUpdateCampaign() {
  const [update, result] = useMutation(UPDATE_CAMPAIGN);
  return {
    update: (input: UpdateCampaignInput) => update({ variables: { input } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useLaunchCampaign() {
  const [launch, result] = useMutation(LAUNCH_CAMPAIGN, {
    refetchQueries: ['GetCampaigns'],
  });
  return {
    launch: (campaignId: string, serviceProviderId: string) =>
      launch({ variables: { campaignId, serviceProviderId } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useCancelCampaign() {
  const [cancel, result] = useMutation(CANCEL_CAMPAIGN, {
    refetchQueries: ['GetCampaign', 'GetCampaigns'],
  });
  return {
    cancel: (campaignId: string, serviceProviderId: string) =>
      cancel({ variables: { campaignId, serviceProviderId } }),
    loading: result.loading,
    error: result.error,
  };
}

export function useCampaignProgressUpdated(serviceProviderId: string) {
  return useSubscription<{ providerCampaignProgressUpdated: Campaign }>(CAMPAIGN_PROGRESS_SUBSCRIPTION, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
  });
}
