'use client';

import { Send, Clock, AlertTriangle, Users, Tag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { ComposeForm } from '@/components/NotificationComposer';
import type { PolicyCheckResult } from '@/lib/graphql/customers';
import { getCategoryLabel, getCategoryVariant } from '@/lib/graphql/notifications';

interface SendConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  form: ComposeForm;
  policyResult: PolicyCheckResult | null;
  loading?: boolean;
}

export function SendConfirmModal({
  open,
  onConfirm,
  onCancel,
  form,
  policyResult,
  loading,
}: SendConfirmModalProps) {
  const isScheduled = form.scheduleType === 'scheduled' && form.scheduledAt;
  const policyBlocked = policyResult && !policyResult.allowed;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={isScheduled ? 'Schedule Notification' : 'Send Notification'}
      description="Review the details below before confirming."
      size="md"
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-border-primary text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !!policyBlocked}
            className="flex items-center gap-2 px-5 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending…
              </>
            ) : isScheduled ? (
              <>
                <Clock size={14} /> Schedule
              </>
            ) : (
              <>
                <Send size={14} /> Send Now
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Summary */}
        <div className="space-y-3">
          <SummaryRow
            icon={<Users size={14} className="text-text-muted" />}
            label="Recipients"
            value={`${form.recipients.length} customer${form.recipients.length !== 1 ? 's' : ''}`}
          />
          <SummaryRow
            icon={<Tag size={14} className="text-text-muted" />}
            label="Category"
            value={
              <Badge variant={getCategoryVariant(form.category)} size="sm">
                {getCategoryLabel(form.category)}
              </Badge>
            }
          />
          <SummaryRow
            icon={<Send size={14} className="text-text-muted" />}
            label="Channel"
            value={form.channel}
          />
          <SummaryRow
            icon={<AlertTriangle size={14} className="text-text-muted" />}
            label="Priority"
            value={form.priority}
          />
          {isScheduled && (
            <SummaryRow
              icon={<Clock size={14} className="text-text-muted" />}
              label="Scheduled"
              value={new Date(form.scheduledAt).toLocaleString()}
            />
          )}
        </div>

        {/* Subject + Body preview */}
        <div className="bg-bg-primary border border-border-secondary rounded-lg p-3 space-y-1">
          <p className="text-sm font-medium text-text-primary">{form.subject}</p>
          <p className="text-xs text-text-secondary line-clamp-3">{form.body}</p>
        </div>

        {/* Policy verdict */}
        {policyResult && (
          <div
            className={`flex items-start gap-2 p-3 rounded-lg ${
              policyResult.allowed
                ? 'bg-status-success/10 border border-status-success/20'
                : 'bg-status-error/10 border border-status-error/20'
            }`}
          >
            <AlertTriangle
              size={14}
              className={policyResult.allowed ? 'text-status-success mt-0.5' : 'text-status-error mt-0.5'}
            />
            <div>
              <p
                className={`text-xs font-medium ${
                  policyResult.allowed ? 'text-status-success' : 'text-status-error'
                }`}
              >
                {policyResult.allowed ? 'Policy check passed' : 'Blocked by policy'}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{policyResult.reason}</p>
            </div>
          </div>
        )}

        {policyBlocked && (
          <p className="text-xs text-status-error">
            Cannot send — notification is blocked by the policy engine. Adjust category or recipients and re-check.
          </p>
        )}
      </div>
    </Modal>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-xs text-text-muted w-20">{label}</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}
