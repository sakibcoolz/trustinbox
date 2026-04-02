'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import NotificationComposer, { type ComposeForm, DEFAULT_COMPOSE_FORM } from '@/components/NotificationComposer';
import { NotificationPreviewPanel } from '@/components/notifications/NotificationPreviewPanel';
import { SendConfirmModal } from '@/components/notifications/SendConfirmModal';
import { useDraftSave } from '@/hooks/useDraftSave';
import { useCheckPolicy, type PolicyCheckResult } from '@/lib/graphql/customers';
import { useSendNotification } from '@/lib/graphql/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';

const DRAFT_KEY = 'provider:notification:compose:draft';

export default function ComposeNotificationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeServiceProvider } = useAuth();
  const toast = useToast();

  // ── Pre-fill recipients from URL ──
  const urlRecipients = searchParams.get('recipients')?.split(',').filter(Boolean) ?? [];

  // ── Draft auto-save (5.11) ──
  const {
    form,
    setForm,
    hasDraft,
    restore: restoreDraft,
    discard: discardDraft,
    clear: clearDraft,
    lastSaved,
  } = useDraftSave<ComposeForm>(DRAFT_KEY, {
    ...DEFAULT_COMPOSE_FORM,
    recipients: urlRecipients.length > 0 ? urlRecipients : DEFAULT_COMPOSE_FORM.recipients,
  });

  // ── Policy check (5.8) ──
  const { checkPolicy, result: policyResult, loading: policyLoading } = useCheckPolicy();
  const [policyState, setPolicyState] = useState<PolicyCheckResult | null>(null);

  const handlePolicyCheck = useCallback(() => {
    if (form.recipients.length === 0 || !activeServiceProvider) return;
    checkPolicy(activeServiceProvider.id, form.category, form.channel);
  }, [form.recipients, form.category, form.channel, activeServiceProvider, checkPolicy]);

  // Sync policy result
  useEffect(() => {
    if (policyResult) setPolicyState(policyResult);
  }, [policyResult]);

  // Clear policy result when key fields change
  useEffect(() => {
    setPolicyState(null);
  }, [form.category, form.channel, form.recipients.length]);

  // ── Send (5.13) ──
  const { send: sendNotification, loading: sendLoading } = useSendNotification();
  const [showConfirm, setShowConfirm] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const validationErrors: Record<string, string> = {};
  if (!form.subject.trim()) validationErrors.subject = 'Subject is required';
  if (!form.body.trim()) validationErrors.body = 'Body is required';
  if (form.recipients.length === 0) validationErrors.recipients = 'At least one recipient is required';

  function handleSendClick() {
    setAttempted(true);
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setShowConfirm(true);
  }

  async function handleConfirmSend() {
    try {
      await sendNotification({
        recipientIds: form.recipients,
        category: form.category,
        channel: form.channel,
        title: form.subject,
        body: form.body,
        priority: form.priority,
        scheduledAt: form.scheduleType === 'scheduled' && form.scheduledAt ? form.scheduledAt : undefined,
      });
      clearDraft();
      toast.success('Notification sent successfully.');
      router.push('/notifications');
    } catch {
      toast.error('Failed to send notification. Please try again.');
    } finally {
      setShowConfirm(false);
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Compose Notification</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            Create and send a notification through the policy engine
          </p>
        </div>
        {lastSaved && (
          <span className="text-[10px] text-text-muted">
            Draft saved {formatRelativeTime(lastSaved)}
          </span>
        )}
      </div>

      {/* Draft recovery banner */}
      {hasDraft && (
        <div className="flex items-center gap-3 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
          <p className="text-sm text-text-secondary flex-1">You have an unsaved draft. Would you like to restore it?</p>
          <button
            onClick={restoreDraft}
            className="px-3 py-1.5 text-xs font-medium text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
          >
            Restore
          </button>
          <button
            onClick={discardDraft}
            className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary rounded-lg transition-colors"
          >
            Discard
          </button>
        </div>
      )}

      {/* Two-column layout: Composer + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer (5.7 + 5.8) */}
        <div className="lg:col-span-2">
          <NotificationComposer
            form={form}
            setForm={setForm}
            policyResult={policyState}
            policyLoading={policyLoading}
            onPolicyCheck={handlePolicyCheck}
            disabled={sendLoading}
            errors={attempted ? validationErrors : {}}
          />
        </div>

        {/* Preview sidebar (5.9) */}
        <div className="space-y-4">
          <NotificationPreviewPanel form={form} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t border-border-primary pt-6">
        <Link
          href="/notifications"
          className="px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSendClick}
          disabled={sendLoading || !form.subject || !form.body || form.recipients.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
        >
          {form.scheduleType === 'scheduled' ? 'Schedule Notification' : 'Send Notification'}
        </button>
      </div>

      {/* Confirm Modal (5.10) */}
      <SendConfirmModal
        open={showConfirm}
        onConfirm={handleConfirmSend}
        onCancel={() => setShowConfirm(false)}
        form={form}
        policyResult={policyState}
        loading={sendLoading}
      />
    </div>
  );
}
