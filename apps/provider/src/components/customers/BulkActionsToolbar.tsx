'use client';

import { Send, Megaphone, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';

interface BulkActionsToolbarProps {
  selectedIds: Set<string>;
  onDeselectAll: () => void;
  onAddToCampaign?: () => void;
}

export function BulkActionsToolbar({ selectedIds, onDeselectAll, onAddToCampaign }: BulkActionsToolbarProps) {
  const router = useRouter();
  const canSend = usePermission('notifications:send');
  const canCampaign = usePermission('campaigns:create');

  if (selectedIds.size === 0) return null;

  const ids = Array.from(selectedIds);

  function handleSendNotification() {
    const params = new URLSearchParams({ recipients: ids.join(',') });
    router.push(`/notifications/compose?${params.toString()}`);
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3 bg-bg-elevated border border-border-primary rounded-xl shadow-lg animate-slide-up">
      <span className="text-sm font-medium text-text-primary">
        {selectedIds.size} customer{selectedIds.size !== 1 ? 's' : ''} selected
      </span>

      <div className="flex items-center gap-2">
        {canSend && (
          <button
            onClick={handleSendNotification}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue text-white rounded-lg text-xs font-medium hover:bg-accent-blue/90 transition-colors"
          >
            <Send size={13} /> Send Notification
          </button>
        )}
        {canCampaign && (
          <button
            onClick={onAddToCampaign}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-secondary text-text-secondary rounded-lg text-xs font-medium hover:text-text-primary hover:border-border-active transition-colors"
          >
            <Megaphone size={13} /> Add to Campaign
          </button>
        )}
      </div>

      <button
        onClick={onDeselectAll}
        className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
