import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { TenantScopeBadge } from '@/components/ai/TenantScopeBadge';

export const metadata: Metadata = {
  title: 'AI Studio · TrustInbox',
  description: 'Bots, knowledge bases, and action audit for your AI workflows.',
};

export default function AIStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border-primary bg-bg-secondary">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-purple" />
          <h1 className="text-sm font-semibold text-text-primary">AI Studio</h1>
        </div>
        <TenantScopeBadge />
      </header>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
