'use client';

import { useState, use } from 'react';
import {
  ArrowLeft,
  Shield,
  Bell,
  PhoneCall,
  User,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useCustomerDetail, useCustomerTimeline, type CustomerDetail, type PrivacyPreference, type DNDRule, type AvailabilitySlot } from '@/lib/graphql/customers';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/Skeleton';
import { PrivacyStatusDisplay } from '@/components/customers/PrivacyStatusDisplay';
import { CommunicationTimeline } from '@/components/customers/CommunicationTimeline';
import { CustomerActions } from '@/components/customers/CustomerActions';
import { PolicyCheckIndicator } from '@/components/customers/PolicyCheckIndicator';
import { CustomerNotesSection, CustomerTagsSection } from '@/components/customers/CustomerNotesTags';
import { formatRelativeTime, formatNumber } from '@/lib/format';

// ─── Default Privacy (fallback) ─────────────────────────

const DEFAULT_PRIVACY: PrivacyPreference = {
  allowPersonalNotifications: true,
  allowSPNotifications: true,
  allowAdvertisements: false,
  allowCallbackRequests: true,
  allowChat: true,
  allowDocumentShares: true,
  requireCallApproval: false,
};

// ─── Page Component ─────────────────────────────────────

export default function CustomerDetailPage({ params }: { params: Promise<{ virtualId: string }> }) {
  const { virtualId } = use(params);
  const [tab, setTab] = useState<'overview' | 'timeline' | 'policy'>('overview');

  const { data, loading, error } = useCustomerDetail(virtualId);
  const { data: timelineData, loading: timelineLoading } = useCustomerTimeline(virtualId);

  const notifications = data?.notifications?.nodes ?? [];
  const notificationCount = data?.notifications?.totalCount ?? 0;
  const callbacks = data?.callbackRequests?.nodes ?? [];
  const callbackCount = data?.callbackRequests?.totalCount ?? 0;
  const timelineEvents = timelineData?.customerTimeline?.nodes ?? [];

  // Derive customer info from first conversation/notification data
  const privacy: PrivacyPreference = DEFAULT_PRIVACY;
  const dndRules: DNDRule[] = [];
  const availabilitySlots: AvailabilitySlot[] = [];

  const deliveredCount = notifications.filter((n: { status: string }) => n.status === 'DELIVERED').length;
  const failedCount = notifications.filter((n: { status: string }) => n.status === 'FAILED').length;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'timeline', label: 'Timeline', icon: Clock },
    { key: 'policy', label: 'Policy Check', icon: Shield },
  ] as const;

  if (loading) return <CustomerDetailSkeleton />;
  if (error) return <ErrorDisplay virtualId={virtualId} error={error.message} />;

  return (
    <div className="p-8 space-y-6">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center">
              <User size={20} className="text-text-muted" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Virtual User #{virtualId.replace('VID-', '')}</h1>
              <p className="font-mono text-xs text-text-muted mt-0.5">{virtualId}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions (4.10) */}
        <CustomerActions virtualId={virtualId} privacyPreference={privacy} />
      </div>

      {/* Tags (4.12) */}
      <CustomerTagsSection virtualId={virtualId} />

      {/* Summary Stats Cards (4.7) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Total Notifications</p>
            <p className="text-xl font-semibold">{formatNumber(notificationCount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Delivered / Failed</p>
            <p className="text-xl font-semibold">
              <span className="text-status-success">{deliveredCount}</span>
              <span className="text-text-muted mx-1">/</span>
              <span className="text-status-error">{failedCount}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Callbacks</p>
            <p className="text-xl font-semibold">{formatNumber(callbackCount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted mb-1">Consent</p>
            <StatusBadge status="ACTIVE" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-primary">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Overview Tab (4.7 + 4.8 + 4.12) */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Privacy Status Display (4.8) */}
          <PrivacyStatusDisplay
            preference={privacy}
            dndRules={dndRules}
            availabilitySlots={availabilitySlots}
          />

          {/* Notes (4.12) */}
          <CustomerNotesSection virtualId={virtualId} />
        </div>
      )}

      {/* Timeline Tab (4.9) */}
      {tab === 'timeline' && (
        <CommunicationTimeline
          events={timelineEvents}
          loading={timelineLoading}
        />
      )}

      {/* Policy Check Tab (4.11) */}
      {tab === 'policy' && <PolicyCheckIndicator />}
    </div>
  );
}

// ─── Loading State ──────────────────────────────────────

function CustomerDetailSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ─── Error State ────────────────────────────────────────

function ErrorDisplay({ virtualId, error }: { virtualId: string; error: string }) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <h1 className="text-2xl font-semibold">Customer Detail</h1>
      </div>
      <div className="bg-status-error/10 border border-status-error/20 rounded-xl p-6 text-center">
        <p className="text-sm text-status-error font-medium">Failed to load customer data</p>
        <p className="text-xs text-text-muted mt-1">{error}</p>
        <p className="text-xs text-text-muted mt-1">Virtual ID: {virtualId}</p>
      </div>
    </div>
  );
}
