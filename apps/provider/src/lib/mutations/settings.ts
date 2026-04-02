'use client';

import { useCallback } from 'react';
import { useMutation, post, patch, del } from './base';

export function useInviteTeamMember() {
  return useMutation(useCallback(
    (input: unknown) => post('/api/team/invitations', input), [],
  ));
}

export function useRevokeInvitation() {
  return useMutation(useCallback(
    (invitationId: unknown) => post('/api/team/invitations/revoke', { invitationId }), [],
  ));
}

export function useChangeTeamMemberRole() {
  return useMutation(useCallback(
    (memberId: unknown, role: unknown) => patch('/api/team/members/role', { memberId, role }), [],
  ));
}

export function useRemoveTeamMember() {
  return useMutation(useCallback(
    (memberId: unknown) => del(`/api/team/members/role?memberId=${memberId}`), [],
  ));
}

export function useUpdateOrganizationProfile() {
  return useMutation(useCallback(
    (input: unknown) => patch('/api/profile', input), [],
  ));
}
