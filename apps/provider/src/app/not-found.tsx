import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-status-warning/10 flex items-center justify-center mb-4">
        <FileQuestion size={32} className="text-status-warning" />
      </div>

      <h2 className="text-lg font-semibold text-text-primary mb-1">Page not found</h2>

      <p className="text-sm text-text-secondary max-w-md text-center mb-6">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
      >
        <Home size={14} />
        Go to Dashboard
      </Link>
    </div>
  );
}
