import { gql, useQuery, useLazyQuery } from '@apollo/client';

// ─── Types ──────────────────────────────────────────────

export interface CustomerRow {
  virtualId: string;
  displayName: string;
  category: 'PERSONAL' | 'SERVICE_PROVIDER' | 'ADVERTISEMENT';
  lastContactAt: string;
  status: 'ACTIVE' | 'BLOCKED' | 'DND' | 'OPTED_OUT';
  interactionCount: number;
}

export interface CustomerConnection {
  nodes: CustomerRow[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
}

export interface PrivacyPreference {
  allowPersonalNotifications: boolean;
  allowSPNotifications: boolean;
  allowAdvertisements: boolean;
  allowCallbackRequests: boolean;
  allowChat: boolean;
  allowDocumentShares: boolean;
  requireCallApproval: boolean;
}

export interface DNDRule {
  id: string;
  scopeType: string;
  scopeRefId?: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CustomerDetail {
  virtualId: string;
  displayName: string;
  userType: string;
  avatarUrl?: string;
  joinedAt: string;
  lastContactAt: string;
  privacyPreference: PrivacyPreference;
  dndRules: DNDRule[];
  availabilitySlots: AvailabilitySlot[];
  stats: {
    totalNotifications: number;
    deliveredCount: number;
    failedCount: number;
    callbackCount: number;
    documentsShared: number;
  };
}

export interface CustomerNotification {
  id: string;
  category: string;
  title: string;
  body: string;
  priority: string;
  status: string;
  channel: string;
  createdAt: string;
}

export interface CustomerCallback {
  id: string;
  reason: string;
  details: string;
  status: string;
  requestedAt: string;
  respondedAt: string | null;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export interface CustomerNote {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerTag {
  id: string;
  label: string;
  color?: string;
}

export interface PolicyCheckResult {
  allowed: boolean;
  decisionCode: string;
  reason: string;
  appliedRules: string[];
}

// ─── Queries ────────────────────────────────────────────

export const CUSTOMER_LIST_QUERY = gql`
  query CustomerList(
    $search: String
    $category: NotificationCategory
    $status: String
    $orderBy: OrderByInput
    $first: Int
    $after: String
  ) {
    conversations(
      search: $search
      category: $category
      status: $status
      orderBy: $orderBy
      first: $first
      after: $after
    ) {
      nodes {
        id
        status
        serviceProvider {
          id
          name
        }
        createdAt
        updatedAt
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const CUSTOMER_DETAIL_QUERY = gql`
  query CustomerDetail($virtualId: String!) {
    notifications(recipientVirtualId: $virtualId, limit: 20) {
      nodes {
        id
        category
        title
        body
        priority
        status
        createdAt
      }
      totalCount
    }
    callbackRequests(virtualId: $virtualId, limit: 10) {
      nodes {
        id
        reason
        details
        status
        requestedAt
        respondedAt
      }
      totalCount
    }
  }
`;

export const CUSTOMER_TIMELINE_QUERY = gql`
  query CustomerTimeline($virtualId: String!, $limit: Int, $offset: Int) {
    customerTimeline(virtualId: $virtualId, limit: $limit, offset: $offset) {
      nodes {
        id
        type
        title
        description
        timestamp
        metadata
      }
      totalCount
    }
  }
`;

export const CHECK_COMMUNICATION_POLICY = gql`
  query CheckCommunicationPolicy(
    $serviceProviderId: ID!
    $category: NotificationCategory!
    $channel: String!
  ) {
    checkCommunicationPolicy(
      serviceProviderId: $serviceProviderId
      category: $category
      channel: $channel
    ) {
      allowed
      decisionCode
      reason
      appliedRules
    }
  }
`;

export const CUSTOMER_NOTES_QUERY = gql`
  query CustomerNotes($virtualId: String!) {
    customerNotes(virtualId: $virtualId) {
      id
      content
      authorName
      createdAt
      updatedAt
    }
  }
`;

export const CUSTOMER_TAGS_QUERY = gql`
  query CustomerTags($virtualId: String!) {
    customerTags(virtualId: $virtualId) {
      id
      label
      color
    }
  }
`;

// ─── Mutations ──────────────────────────────────────────

export const ADD_CUSTOMER_NOTE = gql`
  mutation AddCustomerNote($virtualId: String!, $content: String!) {
    addCustomerNote(virtualId: $virtualId, content: $content) {
      id
      content
      authorName
      createdAt
    }
  }
`;

export const UPDATE_CUSTOMER_NOTE = gql`
  mutation UpdateCustomerNote($id: ID!, $content: String!) {
    updateCustomerNote(id: $id, content: $content) {
      id
      content
      updatedAt
    }
  }
`;

export const DELETE_CUSTOMER_NOTE = gql`
  mutation DeleteCustomerNote($id: ID!) {
    deleteCustomerNote(id: $id)
  }
`;

export const ADD_CUSTOMER_TAG = gql`
  mutation AddCustomerTag($virtualId: String!, $label: String!) {
    addCustomerTag(virtualId: $virtualId, label: $label) {
      id
      label
      color
    }
  }
`;

export const REMOVE_CUSTOMER_TAG = gql`
  mutation RemoveCustomerTag($virtualId: String!, $tagId: ID!) {
    removeCustomerTag(virtualId: $virtualId, tagId: $tagId)
  }
`;

// ─── Hooks ──────────────────────────────────────────────

export interface CustomerListOptions {
  search?: string;
  category?: string[];
  status?: string[];
  sort?: { field: string; direction: 'asc' | 'desc' };
  first?: number;
  after?: string;
}

export function useCustomers(options: CustomerListOptions) {
  const { search, category, status, sort, first = 25, after } = options;
  return useQuery<{ conversations: CustomerConnection }>(CUSTOMER_LIST_QUERY, {
    variables: {
      search: search || undefined,
      category: category?.length === 1 ? category[0] : undefined,
      status: status?.length === 1 ? status[0] : undefined,
      orderBy: sort ? { field: sort.field, direction: sort.direction.toUpperCase() } : { field: 'lastContactAt', direction: 'DESC' },
      first,
      after: after || undefined,
    },
    fetchPolicy: 'cache-and-network',
  });
}

export function useCustomerDetail(virtualId: string) {
  return useQuery(CUSTOMER_DETAIL_QUERY, {
    variables: { virtualId },
    skip: !virtualId,
  });
}

export function useCustomerTimeline(virtualId: string, limit = 20, offset = 0) {
  return useQuery(CUSTOMER_TIMELINE_QUERY, {
    variables: { virtualId, limit, offset },
    skip: !virtualId,
  });
}

export function useCheckPolicy() {
  const [check, { data, loading, error }] = useLazyQuery<{
    checkCommunicationPolicy: PolicyCheckResult;
  }>(CHECK_COMMUNICATION_POLICY);

  return {
    checkPolicy: (serviceProviderId: string, category: string, channel: string) =>
      check({ variables: { serviceProviderId, category, channel } }),
    result: data?.checkCommunicationPolicy ?? null,
    loading,
    error,
  };
}

export function useCustomerNotes(virtualId: string) {
  return useQuery<{ customerNotes: CustomerNote[] }>(CUSTOMER_NOTES_QUERY, {
    variables: { virtualId },
    skip: !virtualId,
  });
}

export function useCustomerTags(virtualId: string) {
  return useQuery<{ customerTags: CustomerTag[] }>(CUSTOMER_TAGS_QUERY, {
    variables: { virtualId },
    skip: !virtualId,
  });
}
