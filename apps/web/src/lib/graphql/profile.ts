import { gql } from '@apollo/client';

export const MY_PROFILE = gql`
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
`;

export const UPDATE_MY_PROFILE = gql`
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
`;

export const UPDATE_MY_AVATAR = gql`
  mutation UpdateMyAvatar($url: String!) {
    updateMyAvatar(url: $url) {
      id
      avatarUrl
    }
  }
`;

export const MY_BLOCKED_PROVIDERS = gql`
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
`;
