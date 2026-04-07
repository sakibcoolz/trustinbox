// ─── GraphQL Conversation Queries ───────────────────────
// Mirrors: apps/web/src/lib/graphql/conversations.ts

const String myConversationsQuery = r'''
  query MyConversations($limit: Int, $offset: Int) {
    myConversations(limit: $limit, offset: $offset) {
      nodes {
        id
        status
        serviceProvider {
          id
          name
          industry
          verificationStatus
        }
        createdAt
        updatedAt
      }
      totalCount
    }
  }
''';

const String myConversationQuery = r'''
  query MyConversation($id: ID!, $messageLimit: Int, $messageOffset: Int) {
    conversation(id: $id) {
      id
      status
      serviceProvider {
        id
        name
        industry
        verificationStatus
      }
      messages(limit: $messageLimit, offset: $messageOffset) {
        nodes {
          id
          senderType
          senderRefId
          messageType
          content
          metadata
          createdAt
        }
        totalCount
      }
      createdAt
      updatedAt
    }
  }
''';

const String sendMessageMutation = r'''
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      senderType
      senderRefId
      messageType
      content
      createdAt
    }
  }
''';
