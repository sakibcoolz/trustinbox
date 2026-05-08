'use client';

import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Reinforces TenantGate guarantees: shows the active service provider
 * scope used for ALL AI / RAG / audit queries on the page.
 */
export function TenantScopeBadge() {
  const { activeServiceProvider } = useAuth();
  if (!activeServiceProvider) return null;
  const shortId = activeServiceProvider.id.slice(0, 8);
  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-bg-card border border-border-primary text-xs"
      title="All AI Studio data is scoped to this service provider via TenantGate"
    >
      <ShieldCheck size={12} className="text-status-success" />
      <span className="text-text-secondary">Scope</span>
      <span className="text-text-primary font-medium truncate max-w-[160px]">
        {activeServiceProvider.name}
      </span>
      <span className="text-text-muted font-mono">#{shortId}</span>
    </div>
  );
}
