// ─── GraphQL Profile Queries ────────────────────────────
// Mirrors: apps/web/src/lib/graphql/profile.ts

const String myProfileQuery = r'''
  query MyProfile {
    myProfile {
      id
      username
      fullName
      email
      avatarUrl
      timezone
      language
    }
  }
''';

const String updateMyProfileMutation = r'''
  mutation UpdateMyProfile($input: UpdateProfileInput!) {
    updateMyProfile(input: $input) {
      id
      username
      fullName
      email
      avatarUrl
      timezone
      language
    }
  }
''';

const String updateMyAvatarMutation = r'''
  mutation UpdateMyAvatar($url: String!) {
    updateMyAvatar(url: $url) {
      id
      avatarUrl
    }
  }
''';

const String myBlockedProvidersQuery = r'''
  query MyBlockedProviders($limit: Int, $offset: Int) {
    myBlockedProviders(limit: $limit, offset: $offset) {
      nodes {
        serviceProvider {
          id
          name
          industry
          verificationStatus
        }
        blockedAt
        reason
      }
      totalCount
    }
  }
''';
