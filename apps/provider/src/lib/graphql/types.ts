// ─── Shared GraphQL Type Interfaces ────────────────────

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    role: string;
  };
}

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  username: string;
  orgName?: string;
  industry?: string;
  legalName?: string;
  website?: string;
  registrationNumber?: string;
  proofIdType?: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  authorizedSignatory?: string;
  termsAccepted?: boolean;
}

export interface MeUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  serviceProviders: ServiceProviderMembership[];
  activeServiceProvider: ServiceProviderDetail | null;
}

export interface ServiceProviderMembership {
  id: string;
  name: string;
  industry: string;
  role: string;
  logoUrl?: string;
  plan?: string;
  status: string;
}

export interface ServiceProviderDetail {
  id: string;
  name: string;
  industry: string;
  logoUrl?: string;
  plan?: string;
  status: string;
  memberCount: number;
  createdAt: string;
}

export interface InvitationValidation {
  valid: boolean;
  organizationName: string;
  inviterName: string;
  role: string;
  email: string;
  expiresAt: string;
}

export interface AcceptInvitationPayload {
  success: boolean;
  serviceProvider: {
    id: string;
    name: string;
    industry: string;
  };
}
