'use client';

import { Bell, PhoneCall, MessageSquare, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import type { PrivacyPreference } from '@/lib/graphql/customers';

interface CustomerActionsProps {
  virtualId: string;
  privacyPreference: PrivacyPreference;
}

interface ActionDef {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  permission: Parameters<typeof usePermission>[0];
  href?: string;
  enabled: boolean;
  disabledReason?: string;
}

export function CustomerActions({ virtualId, privacyPreference }: CustomerActionsProps) {
  const router = useRouter();
  const canNotify = usePermission('notifications:send');
  const canCallback = usePermission('callbacks:manage');
  const canChat = usePermission('conversations:reply');
  const canDocument = usePermission('documents:share');

  const actions: ActionDef[] = [
    {
      label: 'Send Notification',
      icon: Bell,
      permission: 'notifications:send',
      href: `/notifications/compose?recipient=${virtualId}`,
      enabled: canNotify,
    },
    {
      label: 'Request Callback',
      icon: PhoneCall,
      permission: 'callbacks:manage',
      enabled: canCallback && privacyPreference.allowCallbackRequests,
      disabledReason: !privacyPreference.allowCallbackRequests ? 'Customer has blocked callbacks' : undefined,
    },
    {
      label: 'Start Conversation',
      icon: MessageSquare,
      permission: 'conversations:reply',
      href: `/conversations/new?recipient=${virtualId}`,
      enabled: canChat && privacyPreference.allowChat,
      disabledReason: !privacyPreference.allowChat ? 'Customer has blocked chat' : undefined,
    },
    {
      label: 'Share Document',
      icon: FileText,
      permission: 'documents:share',
      enabled: canDocument && privacyPreference.allowDocumentShares,
      disabledReason: !privacyPreference.allowDocumentShares ? 'Customer has blocked documents' : undefined,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        const isDisabled = !action.enabled;

        return (
          <button
            key={action.label}
            onClick={() => action.href && !isDisabled && router.push(action.href)}
            disabled={isDisabled}
            title={isDisabled ? action.disabledReason : action.label}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-secondary text-text-secondary rounded-lg text-xs font-medium hover:text-text-primary hover:border-border-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon size={13} />
            <span className="hidden md:inline">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
