'use client';

import { ErrorCard } from '@/components/ErrorBoundary';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard error={error} onRetry={reset} />;
}
