'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Response shape types ────────────────────────────────────────────────────

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
  joinedAt: string;      // ISO-8601
  virtualPublicId: string;
}

export interface ProfileStats {
  spCount: number;
  messagesCount: number;
  policiesCount: number;
  privacyScore: number;
}

export interface ServiceProviderItem {
  id: string;
  name: string;
  industry: string;
  verificationStatus: string;
  role: string;
  joinedAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'notification' | 'callback' | 'message';
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
}

export interface PrivacyPreferences {
  allowPersonalNotifications: boolean;
  allowSPNotifications: boolean;
  allowAdvertisements: boolean;
  allowCallbackRequests: boolean;
  allowChat: boolean;
  allowDocumentShares: boolean;
  requireCallApproval: boolean;
}

export interface SessionsInfo {
  activeSessions: number;
  lastLoginAt: string;
  hasTwoFactor: boolean;
  passwordUpdatedAt: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  bio?: string;
  location?: string;
  website?: string;
  coverIdx?: number;
  timezone?: string;
  language?: string;
}

export interface UseProfileReturn {
  profile: ProfileData | null;
  stats: ProfileStats | null;
  serviceProviders: ServiceProviderItem[];
  activity: ActivityItem[];
  privacy: PrivacyPreferences | null;
  sessions: SessionsInfo | null;
  loading: boolean;
  error: string | null;
  updateProfile: (payload: UpdateProfilePayload) => Promise<boolean>;
  updatePrivacy: (payload: Partial<PrivacyPreferences>) => Promise<boolean>;
  refresh: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useProfile(): UseProfileReturn {
  const { token } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [serviceProviders, setServiceProviders] = useState<ServiceProviderItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyPreferences | null>(null);
  const [sessions, setSessions] = useState<SessionsInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const authHeader = useCallback(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const get = (path: string) =>
      fetch(`${API_BASE}${path}`, { headers: authHeader() }).then((r) => {
        if (!r.ok) throw new Error(`${path} → ${r.status}`);
        return r.json();
      });

    Promise.all([
      get('/api/profile'),
      get('/api/profile/stats'),
      get('/api/profile/service-providers'),
      get('/api/profile/activity'),
      get('/api/privacy/preferences'),
      get('/api/sessions'),
    ])
      .then(([profileData, statsData, orgsData, activityData, privData, sessData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setStats(statsData);
        setServiceProviders(orgsData.serviceProviders ?? []);
        setActivity(activityData.activity ?? []);
        setPrivacy(privData);
        setSessions(sessData);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message ?? 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, refreshTick, authHeader]);

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload): Promise<boolean> => {
      if (!token) return false;
      try {
        const res = await fetch(`${API_BASE}/api/profile/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? 'Failed to update profile');
          return false;
        }
        // Optimistically update local state
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                fullName: payload.fullName ?? prev.fullName,
                bio: payload.bio ?? prev.bio,
                location: payload.location ?? prev.location,
                website: payload.website ?? prev.website,
                coverIdx: payload.coverIdx ?? prev.coverIdx,
                timezone: payload.timezone ?? prev.timezone,
                language: payload.language ?? prev.language,
              }
            : prev,
        );
        return true;
      } catch {
        setError('Network error – could not save profile');
        return false;
      }
    },
    [token, authHeader],
  );

  const updatePrivacy = useCallback(
    async (payload: Partial<PrivacyPreferences>): Promise<boolean> => {
      if (!token) return false;
      try {
        const res = await fetch(`${API_BASE}/api/privacy/preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? 'Failed to update privacy settings');
          return false;
        }
        setPrivacy((prev) => (prev ? { ...prev, ...payload } : prev));
        // Refresh stats because privacy score depends on preferences
        setRefreshTick((t) => t + 1);
        return true;
      } catch {
        setError('Network error – could not save privacy settings');
        return false;
      }
    },
    [token, authHeader],
  );

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  return { profile, stats, serviceProviders, activity, privacy, sessions, loading, error, updateProfile, updatePrivacy, refresh };
}
