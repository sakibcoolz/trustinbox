'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

// --- Types ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// --- Error Boundary ---
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <ErrorCard error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

// --- Error Card ---
export function ErrorCard({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-status-error/10 flex items-center justify-center mb-4">
        <AlertTriangle size={32} className="text-status-error" />
      </div>

      <h2 className="text-lg font-semibold text-text-primary mb-1">Something went wrong</h2>

      <p className="text-sm text-text-secondary max-w-md text-center mb-6">
        {isDev && error ? error.message : 'An unexpected error occurred. Please try again.'}
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          <RotateCcw size={14} />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 border border-border-primary text-text-secondary text-sm rounded-lg hover:bg-bg-hover transition-colors"
        >
          <Home size={14} />
          Go to Dashboard
        </Link>
      </div>

      {isDev && error?.stack && (
        <details className="mt-8 w-full max-w-2xl">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
            Stack trace
          </summary>
          <pre className="mt-2 p-4 bg-bg-input border border-border-primary rounded-lg text-xs text-text-muted overflow-x-auto font-mono">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
