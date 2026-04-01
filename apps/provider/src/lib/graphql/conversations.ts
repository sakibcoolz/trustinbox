import { gql, useQuery, useLazyQuery, useMutation, useSubscription } from '@apollo/client';

// ─── Types ──────────────────────────────────────────────

export type ConversationStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';
export type SenderType = 'CUSTOMER' | 'AGENT' | 'BOT' | 'SYSTEM';
export type MessageType = 'TEXT' | 'FILE' | 'SYSTEM';
export type ReadStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface ConversationParticipant {
  id: string;
  virtualPublicId: string;
  displayName?: string;
}

export interface ConversationNode {
  id: string;
  status: ConversationStatus;
  participants: ConversationParticipant[];
  assignee?: { id: string; name: string; role: string };
  unreadCount: number;
  messages: { nodes: MessageNode[]; totalCount: number };
  createdAt: string;
  updatedAt: string;
}

export interface ConversationConnection {
  nodes: ConversationNode[];
  totalCount: number;
}

export interface MessageNode {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderName: string;
  content: string;
  messageType: MessageType;
  readStatus: ReadStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MessageConnection {
  nodes: MessageNode[];
  totalCount: number;
}

export interface ConversationDetail extends ConversationNode {
  messages: MessageConnection;
  sharedDocuments: SharedDocument[];
  relatedCallbacks: RelatedCallback[];
}

export interface SharedDocument {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  sharedAt: string;
  sharedBy: string;
}

export interface RelatedCallback {
  id: string;
  status: string;
  requestedAt: string;
  notes?: string;
}

export interface ConversationStats {
  open: number;
  closed: number;
  archived: number;
  unreadTotal: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  activeConversations: number;
}

export interface ConversationListOptions {
  status?: string;
  search?: string;
  unreadOnly?: boolean;
  orderBy?: { field: string; direction: string };
  limit?: number;
  offset?: number;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  messageType?: string;
  metadata?: Record<string, unknown>;
}

// ─── Status Helpers ─────────────────────────────────────

export function getConversationStatusVariant(status: string) {
  const map: Record<string, string> = {
    OPEN: 'success',
    CLOSED: 'neutral',
    ARCHIVED: 'neutral',
  };
  return (map[status.toUpperCase()] ?? 'neutral') as 'success' | 'neutral';
}

export function getConversationStatusLabel(status: string) {
  const map: Record<string, string> = {
    OPEN: 'Open',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived',
  };
  return map[status.toUpperCase()] ?? status;
}

export function getSenderStyle(senderType: SenderType) {
  const styles: Record<SenderType, { bg: string; iconColor: string }> = {
    CUSTOMER: { bg: 'bg-bg-card border border-border-primary', iconColor: 'text-text-muted' },
    BOT: { bg: 'bg-accent-purple/10 border border-accent-purple/20', iconColor: 'text-accent-purple' },
    AGENT: { bg: 'bg-accent-blue/10 border border-accent-blue/20', iconColor: 'text-accent-blue' },
    SYSTEM: { bg: 'bg-bg-tertiary border border-border-primary', iconColor: 'text-text-muted' },
  };
  return styles[senderType] ?? styles.CUSTOMER;
}

// ─── Fragments ──────────────────────────────────────────

const MESSAGE_FRAGMENT = gql`
  fragment MessageFields on Message {
    id
    conversationId
    senderType
    senderName
    content
    messageType
    readStatus
    metadata
    createdAt
  }
`;

// ─── Queries ────────────────────────────────────────────

export const CONVERSATION_LIST_QUERY = gql`
  query ConversationList(
    $status: ConversationStatus
    $search: String
    $unreadOnly: Boolean
    $orderByField: String
    $orderByDirection: String
    $limit: Int
    $offset: Int
  ) {
    conversations(
      status: $status
      search: $search
      unreadOnly: $unreadOnly
      orderBy: { field: $orderByField, direction: $orderByDirection }
      limit: $limit
      offset: $offset
    ) {
      nodes {
        id
        status
        participants {
          id
          virtualPublicId
          displayName
        }
        assignee {
          id
          name
          role
        }
        unreadCount
        messages(limit: 1) {
          nodes {
            ...MessageFields
          }
          totalCount
        }
        createdAt
        updatedAt
      }
      totalCount
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export const CONVERSATION_DETAIL_QUERY = gql`
  query ConversationDetail($id: ID!, $messageLimit: Int, $messageOffset: Int) {
    conversation(id: $id) {
      id
      status
      participants {
        id
        virtualPublicId
        displayName
      }
      assignee {
        id
        name
        role
      }
      unreadCount
      messages(limit: $messageLimit, offset: $messageOffset) {
        nodes {
          ...MessageFields
        }
        totalCount
      }
      sharedDocuments {
        id
        name
        fileType
        fileSize
        sharedAt
        sharedBy
      }
      relatedCallbacks {
        id
        status
        requestedAt
        notes
      }
      createdAt
      updatedAt
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export const CONVERSATION_STATS_QUERY = gql`
  query ConversationStats($serviceProviderId: ID!) {
    conversationStats(serviceProviderId: $serviceProviderId) {
      open
      closed
      archived
      unreadTotal
    }
  }
`;

export const TEAM_MEMBERS_QUERY = gql`
  query TeamMembers($serviceProviderId: ID!, $role: String) {
    teamMembers(serviceProviderId: $serviceProviderId, role: $role) {
      id
      name
      email
      role
      avatarUrl
      activeConversations
    }
  }
`;

// ─── Mutations ──────────────────────────────────────────

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      ...MessageFields
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export const ASSIGN_CONVERSATION_MUTATION = gql`
  mutation AssignConversation($conversationId: ID!, $agentId: ID!) {
    assignConversation(conversationId: $conversationId, agentId: $agentId) {
      id
      assignee {
        id
        name
        role
      }
    }
  }
`;

export const ARCHIVE_CONVERSATION_MUTATION = gql`
  mutation ArchiveConversation($id: ID!) {
    archiveConversation(id: $id) {
      id
      status
    }
  }
`;

// ─── Subscriptions ──────────────────────────────────────

export const PROVIDER_MESSAGE_RECEIVED_SUBSCRIPTION = gql`
  subscription ProviderMessageReceived($serviceProviderId: ID!) {
    providerMessageReceived(serviceProviderId: $serviceProviderId) {
      ...MessageFields
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export const MESSAGE_RECEIVED_SUBSCRIPTION = gql`
  subscription MessageReceived($conversationId: ID!) {
    messageReceived(conversationId: $conversationId) {
      ...MessageFields
    }
  }
  ${MESSAGE_FRAGMENT}
`;

// ─── Hooks ──────────────────────────────────────────────

export function useConversations(options: ConversationListOptions) {
  return useQuery<{ conversations: ConversationConnection }>(CONVERSATION_LIST_QUERY, {
    variables: {
      status: options.status,
      search: options.search,
      unreadOnly: options.unreadOnly,
      orderByField: options.orderBy?.field ?? 'updatedAt',
      orderByDirection: options.orderBy?.direction ?? 'DESC',
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
    },
    fetchPolicy: 'cache-and-network',
  });
}

export function useConversation(id: string) {
  const result = useQuery<{ conversation: ConversationDetail }>(CONVERSATION_DETAIL_QUERY, {
    variables: { id, messageLimit: 50, messageOffset: 0 },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const fetchMoreMessages = () => {
    const currentCount = result.data?.conversation.messages.nodes.length ?? 0;
    return result.fetchMore({
      variables: { messageOffset: currentCount },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          conversation: {
            ...prev.conversation,
            messages: {
              ...fetchMoreResult.conversation.messages,
              nodes: [
                ...fetchMoreResult.conversation.messages.nodes,
                ...prev.conversation.messages.nodes,
              ],
            },
          },
        };
      },
    });
  };

  const hasMoreMessages =
    (result.data?.conversation.messages.nodes.length ?? 0) <
    (result.data?.conversation.messages.totalCount ?? 0);

  return { ...result, fetchMoreMessages, hasMoreMessages };
}

export function useConversationStats(spId: string) {
  return useQuery<{ conversationStats: ConversationStats }>(CONVERSATION_STATS_QUERY, {
    variables: { serviceProviderId: spId },
    skip: !spId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useTeamMembers(spId: string, role?: string) {
  return useQuery<{ teamMembers: TeamMember[] }>(TEAM_MEMBERS_QUERY, {
    variables: { serviceProviderId: spId, role },
    skip: !spId,
  });
}

export function useSendMessage() {
  const [sendMutation, result] = useMutation(SEND_MESSAGE_MUTATION);

  const sendMessage = (input: SendMessageInput) =>
    sendMutation({
      variables: { input },
      optimisticResponse: {
        sendMessage: {
          id: `temp-${Date.now()}`,
          conversationId: input.conversationId,
          senderType: 'AGENT',
          senderName: 'You',
          content: input.content,
          messageType: input.messageType ?? 'TEXT',
          readStatus: 'SENT',
          metadata: input.metadata ?? null,
          createdAt: new Date().toISOString(),
          __typename: 'Message',
        },
      },
      update(cache, { data }) {
        if (!data?.sendMessage) return;
        const msg = data.sendMessage;
        const msgRef = cache.identify({ __typename: 'Message', id: msg.id });
        cache.modify({
          id: cache.identify({ __typename: 'Conversation', id: input.conversationId }),
          fields: {
            messages(existing = { nodes: [], totalCount: 0 }) {
              return {
                ...existing,
                nodes: [...existing.nodes, { __ref: msgRef }],
                totalCount: existing.totalCount + 1,
              };
            },
            updatedAt() {
              return msg.createdAt;
            },
          },
        });
      },
    });

  return { sendMessage, loading: result.loading, error: result.error };
}

export function useAssignConversation() {
  const [assign, result] = useMutation(ASSIGN_CONVERSATION_MUTATION);
  return {
    assign: (conversationId: string, agentId: string) =>
      assign({
        variables: { conversationId, agentId },
        refetchQueries: ['ConversationDetail'],
      }),
    loading: result.loading,
    error: result.error,
  };
}

export function useArchiveConversation() {
  const [archive, result] = useMutation(ARCHIVE_CONVERSATION_MUTATION);
  return {
    archive: (id: string) =>
      archive({
        variables: { id },
        refetchQueries: ['ConversationList', 'ConversationStats'],
      }),
    loading: result.loading,
    error: result.error,
  };
}

export function useProviderMessageSubscription(spId: string) {
  return useSubscription<{ providerMessageReceived: MessageNode }>(
    PROVIDER_MESSAGE_RECEIVED_SUBSCRIPTION,
    {
      variables: { serviceProviderId: spId },
      skip: !spId,
    },
  );
}

export function useMessageSubscription(conversationId: string) {
  return useSubscription<{ messageReceived: MessageNode }>(MESSAGE_RECEIVED_SUBSCRIPTION, {
    variables: { conversationId },
    skip: !conversationId,
    onData({ client, data: subscriptionData }) {
      const newMessage = subscriptionData.data?.messageReceived;
      if (!newMessage) return;

      client.cache.modify({
        id: client.cache.identify({ __typename: 'Conversation', id: conversationId }),
        fields: {
          messages(existing = { nodes: [], totalCount: 0 }) {
            const msgRef = client.cache.identify({ __typename: 'Message', id: newMessage.id });
            const alreadyExists = existing.nodes.some(
              (ref: { __ref?: string }) => ref.__ref === msgRef,
            );
            if (alreadyExists) return existing;
            return {
              ...existing,
              nodes: [...existing.nodes, { __ref: msgRef }],
              totalCount: existing.totalCount + 1,
            };
          },
          updatedAt() {
            return newMessage.createdAt;
          },
        },
      });
    },
  });
}
