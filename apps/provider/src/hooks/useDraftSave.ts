'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const DRAFT_EXPIRY_HOURS = 24;

interface DraftEntry<T> {
  form: T;
  savedAt: string;
}

export function useDraftSave<T>(key: string, defaultValue: T) {
  const [form, setForm] = useState<T>(defaultValue);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const draft: DraftEntry<T> = JSON.parse(stored);
        const ageMs = Date.now() - new Date(draft.savedAt).getTime();
        if (ageMs < DRAFT_EXPIRY_HOURS * 3600_000) {
          setHasDraft(true);
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch {
      localStorage.removeItem(key);
    }
  }, [key]);

  // Auto-save every 5 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const formAny = form as Record<string, unknown>;
      const hasContent = formAny && (
        (typeof formAny.subject === 'string' && formAny.subject.length > 0) ||
        (typeof formAny.body === 'string' && formAny.body.length > 0)
      );
      if (hasContent) {
        const entry: DraftEntry<T> = { form, savedAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(entry));
        setLastSaved(entry.savedAt);
      }
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [form, key]);

  const restore = useCallback(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const draft: DraftEntry<T> = JSON.parse(stored);
        setForm(draft.form);
        setHasDraft(false);
      }
    } catch {
      // ignore
    }
  }, [key]);

  const discard = useCallback(() => {
    localStorage.removeItem(key);
    setHasDraft(false);
  }, [key]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setHasDraft(false);
    setLastSaved(null);
  }, [key]);

  return { form, setForm, hasDraft, restore, discard, clear, lastSaved };
}
