const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const spId = typeof window !== 'undefined' ? localStorage.getItem('activeSpId') : null;
  if (spId) headers['X-Service-Provider-Id'] = spId;
  return headers;
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...getHeaders(), ...opts?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || 'Request failed', res.status);
  }
  return res.json();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ─── Auth ──────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: { id: string; email: string; fullName: string; username: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; fullName: string; username: string; orgName?: string; industry?: string }) =>
    request<{ accessToken: string; refreshToken: string; user: { id: string; email: string; fullName: string; username: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () =>
    request<{ id: string; email: string; fullName: string; username: string; role: string }>('/api/auth/me'),
};

// ─── Team Management ────────────────────────────────────
export interface TeamMember {
  id: string;
  userId: string;
  serviceProviderId: string;
  role: string;
  status: string;
}

export interface Invitation {
  id: string;
  email: string;
  serviceProviderId: string;
  role: string;
  status: string;
  invitedBy: string;
  expiresAt?: string;
  createdAt?: string;
}

export const team = {
  listMembers: (limit = 50, offset = 0) =>
    request<{ items: TeamMember[]; total: number }>(`/api/team/members?limit=${limit}&offset=${offset}`),

  listInvitations: (status?: string, limit = 50, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (status) params.set('status', status);
    return request<{ items: Invitation[]; total: number }>(`/api/team/invitations?${params}`);
  },

  invite: (email: string, role: string) =>
    request<{ invitationId: string }>('/api/team/invitations', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  revokeInvitation: (invitationId: string) =>
    request<{ success: boolean }>('/api/team/invitations/revoke', {
      method: 'POST',
      body: JSON.stringify({ invitationId }),
    }),

  acceptInvitation: (token: string) =>
    request<{ success: boolean }>('/api/team/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  changeRole: (targetUserId: string, newRole: string) =>
    request<{ success: boolean }>('/api/team/members/role', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, newRole }),
    }),

  removeMember: (targetUserId: string) =>
    request<{ success: boolean }>('/api/team/members', {
      method: 'DELETE',
      body: JSON.stringify({ targetUserId }),
    }),
};

// ─── Profile ────────────────────────────────────────────
export interface ProfileData {
  id: string;
  email: string;
  username: string;
  fullName: string;
  bio: string;
  location: string;
  website: string;
  coverIdx: number;
  avatarUrl: string;
  timezone: string;
  language: string;
  joinedAt: string;
  virtualPublicId: string;
}

export interface ProfileSP {
  id: string;
  name: string;
  industry: string;
  verificationStatus: string;
  role: string;
  joinedAt: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface SessionsData {
  activeSessions: number;
  lastLoginAt: string;
  hasTwoFactor: boolean;
  passwordUpdatedAt: string;
}

export const profile = {
  get: () => request<ProfileData>('/api/profile'),

  update: (data: { fullName?: string; bio?: string; location?: string; website?: string; timezone?: string; language?: string }) =>
    request<{ status: string }>('/api/profile/update', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  serviceProviders: () =>
    request<{ serviceProviders: ProfileSP[] }>('/api/profile/service-providers'),

  activity: () =>
    request<{ activity: ActivityItem[] }>('/api/profile/activity'),

  sessions: () =>
    request<SessionsData>('/api/sessions'),
};
