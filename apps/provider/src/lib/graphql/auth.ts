// Auth GQL operations are no longer used.
// Auth is handled via httpOnly cookie API routes in /api/auth/*.
// This file is kept for backward compatibility — it only re-exports types.

export type { AuthPayload, TokenPayload, LoginInput, RegisterInput, MeUser, ServiceProviderMembership, ServiceProviderDetail, InvitationValidation, AcceptInvitationPayload } from './types';
