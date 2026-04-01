'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────

type Politeness = 'polite' | 'assertive';

interface LiveRegionContextValue {
  announce: (message: string, politeness?: Politeness) => void;
}

// ─── Context ────────────────────────────────────────────

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

export function useLiveRegion(): LiveRegionContextValue {
  const ctx = useContext(LiveRegionContext);
  if (!ctx) throw new Error('useLiveRegion must be used within <LiveRegionProvider>');
  return ctx;
}

// ─── Provider ───────────────────────────────────────────

export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  const clearRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    // Clear previous to re-trigger screen reader announcement
    if (politeness === 'polite') {
      setPoliteMessage('');
      requestAnimationFrame(() => setPoliteMessage(message));
    } else {
      setAssertiveMessage('');
      requestAnimationFrame(() => setAssertiveMessage(message));
    }

    // Auto-clear after 10s
    if (clearRef.current) clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => {
      setPoliteMessage('');
      setAssertiveMessage('');
    }, 10000);
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      {/* Visually hidden live regions — picked up by screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}
