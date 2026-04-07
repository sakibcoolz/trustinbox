// ─── GraphQL Friends Queries ────────────────────────────
// Mirrors: apps/web/src/lib/graphql/friends.ts

const String myFriendsQuery = r'''
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
''';

const String myFriendRequestsQuery = r'''
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
''';

const String sendFriendRequestMutation = r'''
  mutation SendFriendRequest($userId: ID!, $message: String) {
    sendFriendRequest(userId: $userId, message: $message)
  }
''';

const String acceptFriendRequestMutation = r'''
  mutation AcceptFriendRequest($requestId: ID!) {
    acceptFriendRequest(requestId: $requestId)
  }
''';

const String declineFriendRequestMutation = r'''
  mutation DeclineFriendRequest($requestId: ID!) {
    declineFriendRequest(requestId: $requestId)
  }
''';

const String searchUsersQuery = r'''
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
''';
