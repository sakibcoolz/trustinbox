import { gql } from '@apollo/client';

// ─── Mutations ──────────────────────────────────────────

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        fullName
        username
        role
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        fullName
        username
        role
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
    }
  }
`;

export const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email) {
      success
      message
    }
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      success
      message
    }
  }
`;

// ─── Invitation Mutations ───────────────────────────────

export const ACCEPT_INVITATION_MUTATION = gql`
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token) {
      success
      serviceProvider {
        id
        name
        industry
      }
    }
  }
`;

// ─── Queries ────────────────────────────────────────────

export const VALIDATE_INVITATION_QUERY = gql`
  query ValidateInvitation($token: String!) {
    validateInvitation(token: $token) {
      valid
      organizationName
      inviterName
      role
      email
      expiresAt
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      fullName
      username
      role
      avatarUrl
      phone
      createdAt
      serviceProviders {
        id
        name
        industry
        role
        logoUrl
        plan
        status
      }
      activeServiceProvider {
        id
        name
        industry
        logoUrl
        plan
        status
        memberCount
        createdAt
      }
    }
  }
`;

export const MY_SERVICE_PROVIDERS_QUERY = gql`
  query MyServiceProviders {
    myServiceProviders {
      id
      name
      industry
      role
      logoUrl
      plan
      status
      memberCount
    }
  }
`;
