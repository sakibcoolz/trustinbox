const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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

  register: (data: RegisterPayload) =>
    request<{ accessToken: string; refreshToken: string; user: { id: string; email: string; fullName: string; username: string } }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Multi-part registration with document upload */
  registerWithDocuments: async (data: RegisterPayload, documents: File[]): Promise<{ accessToken: string; refreshToken: string; user: { id: string; email: string; fullName: string; username: string } }> => {
    const formData = new FormData();
    formData.append('payload', JSON.stringify(data));
    documents.forEach((file) => formData.append('documents', file));

    const headers: Record<string, string> = {};
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(body.error || 'Registration failed', res.status);
    }
    return res.json();
  },

  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  me: () =>
    request<{ id: string; email: string; fullName: string; username: string; role: string }>('/api/auth/me'),
};

export interface RegisterPayload {
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

// ─── CMS ────────────────────────────────────────────────
export type ContentStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type ContentType = 'PAGE' | 'ARTICLE' | 'ANNOUNCEMENT' | 'FAQ' | 'POLICY';

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  status: ContentStatus;
  body: string;
  excerpt: string;
  tags: string[];
  authorId: string;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

export const cms = {
  listContent: (params?: { type?: ContentType; status?: ContentStatus; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.type) p.set('type', params.type);
    if (params?.status) p.set('status', params.status);
    p.set('limit', String(params?.limit ?? 50));
    p.set('offset', String(params?.offset ?? 0));
    return request<{ items: ContentItem[]; total: number }>(`/api/cms/content?${p}`);
  },

  getContent: (id: string) =>
    request<ContentItem>(`/api/cms/content/${encodeURIComponent(id)}`),

  createContent: (data: Partial<ContentItem>) =>
    request<ContentItem>('/api/cms/content', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateContent: (id: string, data: Partial<ContentItem>) =>
    request<ContentItem>(`/api/cms/content/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteContent: (id: string) =>
    request<{ success: boolean }>(`/api/cms/content/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  publishContent: (id: string) =>
    request<ContentItem>(`/api/cms/content/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
    }),

  archiveContent: (id: string) =>
    request<ContentItem>(`/api/cms/content/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
    }),

  // Media
  listMedia: (limit = 50, offset = 0) =>
    request<{ items: MediaItem[]; total: number }>(`/api/cms/media?limit=${limit}&offset=${offset}`),

  uploadMedia: async (file: File): Promise<MediaItem> => {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const spId = typeof window !== 'undefined' ? localStorage.getItem('activeSpId') : null;
    if (spId) headers['X-Service-Provider-Id'] = spId;

    const res = await fetch(`${API_BASE}/api/cms/media`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(body.error || 'Upload failed', res.status);
    }
    return res.json();
  },

  deleteMedia: (id: string) =>
    request<{ success: boolean }>(`/api/cms/media/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
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
