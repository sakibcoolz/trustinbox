'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/lib/logger';

// ─── Error Reporter ─────────────────────────────────────

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
}

const REPORT_ENDPOINT = process.env.NEXT_PUBLIC_ERROR_REPORT_URL;

async function reportError(report: ErrorReport): Promise<void> {
  // Log locally
  logger.error('Unhandled error captured', report);

  // Send to remote endpoint if configured
  if (REPORT_ENDPOINT) {
    try {
      await fetch(REPORT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch {
      // Silently fail — don't throw in the error reporter
    }
  }
}

function buildReport(error: Error, componentStack?: string): ErrorReport {
  return {
    message: error.message,
    stack: error.stack,
    componentStack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

// ─── Global Unhandled Error Listeners ───────────────────

let listenersInstalled = false;

export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined' || listenersInstalled) return;
  listenersInstalled = true;

  window.addEventListener('error', (event) => {
    if (event.error instanceof Error) {
      reportError(buildReport(event.error));
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    reportError(buildReport(error));
  });
}

// ─── React Error Boundary ───────────────────────────────

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundaryReporter extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(buildReport(error, info.componentStack ?? undefined));
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-text-primary">Something went wrong</h2>
          <p className="text-sm text-text-muted max-w-md text-center">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
