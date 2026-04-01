'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────

interface TypingIndicatorProps {
  /** VID or display name of who is typing */
  label?: string;
  /** Auto-hide after ms (default 5000) */
  timeout?: number;
}

// ─── Component ──────────────────────────────────────────

export function TypingIndicator({ label, timeout = 5000 }: TypingIndicatorProps) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), timeout);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [label, timeout]);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">
      {/* Typing dots bubble */}
      <div className="flex items-center gap-1 px-3 py-2 bg-bg-hover rounded-2xl rounded-bl-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
      </div>

      {label && (
        <span className="text-xs text-text-muted">
          {label} is typing…
        </span>
      )}
    </div>
  );
}
