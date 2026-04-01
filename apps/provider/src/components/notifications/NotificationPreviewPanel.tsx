'use client';

import { Smartphone, Mail, Bell, MessageSquare } from 'lucide-react';
import type { ComposeForm } from '@/components/NotificationComposer';
import { getCategoryLabel } from '@/lib/graphql/notifications';

interface NotificationPreviewPanelProps {
  form: ComposeForm;
}

export function NotificationPreviewPanel({ form }: NotificationPreviewPanelProps) {
  const channel = form.channel.toUpperCase();

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Preview</h3>
        <span className="text-xs text-text-muted">{form.channel}</span>
      </div>

      {channel === 'SMS' && <SmsPreview form={form} />}
      {channel === 'EMAIL' && <EmailPreview form={form} />}
      {channel === 'PUSH' && <PushPreview form={form} />}
      {channel === 'IN_APP' && <InAppPreview form={form} />}

      {/* Meta */}
      <div className="border-t border-border-primary pt-3 space-y-1">
        <MetaRow label="Category" value={getCategoryLabel(form.category)} />
        <MetaRow label="Priority" value={form.priority} />
        <MetaRow label="Recipients" value={`${form.recipients.length} customer${form.recipients.length !== 1 ? 's' : ''}`} />
        {form.scheduleType === 'scheduled' && form.scheduledAt && (
          <MetaRow label="Scheduled" value={new Date(form.scheduledAt).toLocaleString()} />
        )}
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-secondary">{value}</span>
    </div>
  );
}

// ─── SMS Preview ────────────────────────────────────────

function SmsPreview({ form }: { form: ComposeForm }) {
  return (
    <div className="flex justify-center">
      <div className="w-64 bg-bg-primary rounded-2xl border border-border-secondary p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Smartphone size={14} />
          <span>SMS Preview</span>
        </div>
        <div className="bg-accent-blue/10 rounded-xl rounded-tl-none px-3 py-2">
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {form.body || 'Message body will appear here…'}
          </p>
        </div>
        <p className="text-[10px] text-text-muted text-right">Now</p>
      </div>
    </div>
  );
}

// ─── Email Preview ──────────────────────────────────────

function EmailPreview({ form }: { form: ComposeForm }) {
  return (
    <div className="bg-bg-primary rounded-xl border border-border-secondary overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-primary text-xs text-text-muted">
        <Mail size={14} />
        <span>Email Preview</span>
      </div>
      <div className="p-4 space-y-2">
        <div className="text-xs text-text-muted">
          <span className="font-medium text-text-secondary">Subject: </span>
          {form.subject || 'No subject'}
        </div>
        <div className="border-t border-border-primary pt-3">
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {form.body || 'Email body will appear here…'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Push Preview ───────────────────────────────────────

function PushPreview({ form }: { form: ComposeForm }) {
  return (
    <div className="flex justify-center">
      <div className="w-72 bg-bg-primary rounded-xl border border-border-secondary p-3 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent-blue/20 rounded-md flex items-center justify-center">
            <Bell size={12} className="text-accent-blue" />
          </div>
          <span className="text-[10px] text-text-muted uppercase tracking-wide">TrustInbox</span>
          <span className="text-[10px] text-text-muted ml-auto">now</span>
        </div>
        <p className="text-sm font-medium text-text-primary truncate">
          {form.subject || 'Notification title'}
        </p>
        <p className="text-xs text-text-secondary line-clamp-2">
          {form.body || 'Push notification body will appear here…'}
        </p>
      </div>
    </div>
  );
}

// ─── In-App Preview ─────────────────────────────────────

function InAppPreview({ form }: { form: ComposeForm }) {
  return (
    <div className="bg-bg-primary rounded-xl border border-border-secondary p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-accent-blue/10 rounded-full flex items-center justify-center">
          <MessageSquare size={14} className="text-accent-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {form.subject || 'In-App Notification'}
          </p>
          <p className="text-[10px] text-text-muted">Just now</p>
        </div>
      </div>
      <p className="text-xs text-text-secondary pl-10">
        {form.body || 'In-app notification body will appear here…'}
      </p>
    </div>
  );
}
