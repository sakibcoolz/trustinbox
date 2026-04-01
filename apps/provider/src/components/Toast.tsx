'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Types ---
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismissAll: () => void;
}

// --- Constants ---
const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'border-l-status-success text-status-success',
  error: 'border-l-status-error text-status-error',
  warning: 'border-l-status-warning text-status-warning',
  info: 'border-l-status-info text-status-info',
};

const DURATIONS: Record<Toast['type'], number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

const MAX_TOASTS = 5;

// --- Context ---
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// --- Toast Item ---
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[toast.type];
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [exiting, setExiting] = useState(false);

  const startTimer = useCallback(() => {
    const duration = toast.duration ?? DURATIONS[toast.type];
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 150);
    }, duration);
  }, [toast, onDismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // Start timer on mount
  useEffect(() => { startTimer(); return pauseTimer; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      className={cn(
        'flex items-start gap-3 w-80 p-4 bg-bg-elevated border border-border-primary rounded-xl shadow-2xl border-l-4',
        COLORS[toast.type],
        exiting ? 'animate-toast-out' : 'animate-toast-in',
      )}
    >
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-text-secondary mt-0.5">{toast.description}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-xs text-text-link hover:underline mt-1.5"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => { setExiting(true); setTimeout(onDismiss, 150); }}
        className="p-0.5 text-text-muted hover:text-text-primary shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// --- Provider ---
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      const next = [...prev, { ...t, id }];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, description) => addToast({ type: 'success', title, description }),
    error: (title, description) => addToast({ type: 'error', title, description }),
    warning: (title, description) => addToast({ type: 'warning', title, description }),
    info: (title, description) => addToast({ type: 'info', title, description }),
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
