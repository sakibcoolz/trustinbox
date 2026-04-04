import { gql } from '@apollo/client';

// ─── Friends GraphQL Queries (Placeholder) ─────────────────
// TODO: Migrate friends endpoints from REST to GraphQL once
// the gateway exposes friend-related queries and mutations.
// Current implementation uses REST via /api/friends/*.

export const MY_FRIENDS = gql`
  query MyFriends($limit: Int, $offset: Int) {
    myFriends(limit: $limit, offset: $offset) {
      nodes {
        id
        user {
          id
          username
          fullName
          virtualPublicId
        }
        createdAt
      }
      totalCount
    }
  }
`;

export const MY_FRIEND_REQUESTS = gql`
  query MyFriendRequests($direction: String, $limit: Int, $offset: Int) {
    myFriendRequests(direction: $direction, limit: $limit, offset: $offset) {
      nodes {
        id
        user {
          id
          username
          fullName
          virtualPublicId
        }
        direction
        status
        message
        createdAt
      }
      totalCount
    }
  }
`;

export const SEND_FRIEND_REQUEST = gql`
  mutation SendFriendRequest($userId: ID!, $message: String) {
    sendFriendRequest(userId: $userId, message: $message)
  }
`;

export const ACCEPT_FRIEND_REQUEST = gql`
  mutation AcceptFriendRequest($requestId: ID!) {
    acceptFriendRequest(requestId: $requestId)
  }
`;

export const DECLINE_FRIEND_REQUEST = gql`
  mutation DeclineFriendRequest($requestId: ID!) {
    declineFriendRequest(requestId: $requestId)
  }
`;

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      nodes {
        id
        username
        fullName
        virtualPublicId
      }
      totalCount
    }
  }
`;
