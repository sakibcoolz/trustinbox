'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkExperience {
  id: string;
  jobTitle: string;
  company: string;
  industry: string;
  location: string;
  startDate: string; // YYYY-MM
  endDate: string;   // YYYY-MM or ""
  isCurrent: boolean;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startYear: number;
  endYear: number; // 0 = current
  isCurrent: boolean;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  level: '' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  category: string;
}

export interface UpsertWorkPayload {
  id?: string;
  jobTitle: string;
  company: string;
  industry?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface UpsertEducationPayload {
  id?: string;
  school: string;
  degree?: string;
  field?: string;
  startYear: number;
  endYear?: number;
  isCurrent?: boolean;
  description?: string;
}

export interface AddSkillPayload {
  name: string;
  level?: string;
  category?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCareer() {
  const { token } = useAuth();

  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const authHeader = useCallback(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    setLoading(true);
    fetch(`${API_BASE}/api/career`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setWorkExperience(data.workExperience ?? []);
        setEducation(data.education ?? []);
        setSkills(data.skills ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Failed to load career data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token, refreshTick]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  // ─── Work ────────────────────────────────────────────────────────────────

  const saveWork = useCallback(async (payload: UpsertWorkPayload): Promise<boolean> => {
    setSaving(true);
    try {
      const method = payload.id ? 'PUT' : 'POST';
      const r = await fetch(`${API_BASE}/api/career/work`, {
        method,
        headers: authHeader(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? 'Failed to save work experience');
        return false;
      }
      refresh();
      return true;
    } catch {
      setError('Network error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [authHeader, refresh]);

  const deleteWork = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/career/work?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      if (!r.ok) return false;
      refresh();
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [authHeader, refresh]);

  // ─── Education ───────────────────────────────────────────────────────────

  const saveEducation = useCallback(async (payload: UpsertEducationPayload): Promise<boolean> => {
    setSaving(true);
    try {
      const method = payload.id ? 'PUT' : 'POST';
      const r = await fetch(`${API_BASE}/api/career/education`, {
        method,
        headers: authHeader(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? 'Failed to save education');
        return false;
      }
      refresh();
      return true;
    } catch {
      setError('Network error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [authHeader, refresh]);

  const deleteEducation = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/career/education?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      if (!r.ok) return false;
      refresh();
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [authHeader, refresh]);

  // ─── Skills ──────────────────────────────────────────────────────────────

  const addSkill = useCallback(async (payload: AddSkillPayload): Promise<boolean> => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/career/skills`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? 'Failed to add skill');
        return false;
      }
      refresh();
      return true;
    } catch {
      setError('Network error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [authHeader, refresh]);

  const deleteSkill = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/career/skills?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      if (!r.ok) return false;
      refresh();
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [authHeader, refresh]);

  return {
    workExperience,
    education,
    skills,
    loading,
    saving,
    error,
    saveWork,
    deleteWork,
    saveEducation,
    deleteEducation,
    addSkill,
    deleteSkill,
    refresh,
  };
}
