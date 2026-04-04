import { gql } from '@apollo/client';

export const MY_CONVERSATIONS = gql`
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
`;

export const MY_CONVERSATION = gql`
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
`;

export const SEND_MESSAGE = gql`
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
`;
