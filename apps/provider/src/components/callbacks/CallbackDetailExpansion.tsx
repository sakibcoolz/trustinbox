'use client';

import { useState, useEffect } from 'react';
import { Shield, Clock, Phone, AlertCircle, ChevronUp, Loader2 } from 'lucide-react';
import { CallbackRequest, useCheckCallbackPolicy } from '@/lib/graphql/callbacks';
import CallbackStatusBadge from './CallbackStatusBadge';
import ExpiryIndicator from './ExpiryIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelativeTime } from '@/lib/format';

interface CallbackDetailExpansionProps {
  callbackRequest: CallbackRequest;
  onCollapse: () => void;
}

export default function CallbackDetailExpansion({ callbackRequest: cb, onCollapse }: CallbackDetailExpansionProps) {
  const { user } = useAuth();
  const spId = user?.activeServiceProvider?.id ?? '';
  const { checkPolicy, result: policyResult, loading: policyLoading } = useCheckCallbackPolicy();

  useEffect(() => {
    if (spId && cb.userId) {
      checkPolicy(spId, cb.userId);
    }
  }, [spId, cb.userId, checkPolicy]);

  return (
    <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Request Details</h3>
        <button onClick={onCollapse} className="p-1 rounded hover:bg-bg-hover transition-colors">
          <ChevronUp size={14} className="text-text-muted" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Customer Info */}
        <div className="space-y-1">
          <p className="text-xs text-text-muted">Customer</p>
          <p className="text-sm font-mono text-text-primary">{cb.customerVirtualId}</p>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <p className="text-xs text-text-muted">Status</p>
          <CallbackStatusBadge status={cb.status} />
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <p className="text-xs text-text-muted">Priority</p>
          <p className="text-sm font-medium">{cb.priority}</p>
        </div>

        {/* Requested At */}
        <div className="space-y-1">
          <p className="text-xs text-text-muted">Requested</p>
          <p className="text-sm text-text-secondary" title={new Date(cb.requestedAt).toLocaleString()}>
            {formatRelativeTime(cb.requestedAt)}
          </p>
        </div>

        {/* Assigned Agent */}
        <div className="space-y-1">
          <p className="text-xs text-text-muted">Assigned Agent</p>
          <p className="text-sm text-text-secondary">{cb.assignedAgentName || 'Unassigned'}</p>
        </div>

        {/* Expiry (PENDING only) */}
        {cb.status === 'PENDING' && (
          <div className="space-y-1">
            <p className="text-xs text-text-muted">Expiry</p>
            <ExpiryIndicator requestedAt={cb.requestedAt} />
          </div>
        )}
      </div>

      {/* Reason & Details */}
      <div className="space-y-2">
        <div>
          <p className="text-xs text-text-muted mb-1">Reason</p>
          <p className="text-sm text-text-primary">{cb.reason}</p>
        </div>
        {cb.details && (
          <div>
            <p className="text-xs text-text-muted mb-1">Details</p>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{cb.details}</p>
          </div>
        )}
      </div>

      {/* Approved Slot */}
      {cb.approvedSlotStart && (
        <div className="flex items-center gap-2 p-3 bg-status-success/5 border border-status-success/20 rounded-lg">
          <Phone size={14} className="text-status-success shrink-0" />
          <div>
            <p className="text-xs text-text-muted">Approved Slot</p>
            <p className="text-sm text-text-primary">
              {new Date(cb.approvedSlotStart).toLocaleString()}
              {cb.approvedSlotEnd && ` — ${new Date(cb.approvedSlotEnd).toLocaleTimeString()}`}
            </p>
          </div>
        </div>
      )}

      {/* Rejection Reason */}
      {cb.rejectionReason && (
        <div className="flex items-center gap-2 p-3 bg-status-error/5 border border-status-error/20 rounded-lg">
          <AlertCircle size={14} className="text-status-error shrink-0" />
          <div>
            <p className="text-xs text-text-muted">Rejection Reason</p>
            <p className="text-sm text-text-primary">{cb.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Response Info */}
      {cb.respondedAt && (
        <div className="space-y-1">
          <p className="text-xs text-text-muted">Responded At</p>
          <p className="text-sm text-text-secondary">{new Date(cb.respondedAt).toLocaleString()}</p>
        </div>
      )}

      {/* Completion Info */}
      {cb.outcome && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-bg-card border border-border-primary rounded-lg">
          <div className="space-y-1">
            <p className="text-xs text-text-muted">Outcome</p>
            <p className="text-sm capitalize">{cb.outcome.replace('_', ' ').toLowerCase()}</p>
          </div>
          {cb.callDuration && (
            <div className="space-y-1">
              <p className="text-xs text-text-muted">Duration</p>
              <p className="text-sm">{cb.callDuration} min</p>
            </div>
          )}
          {cb.completionNotes && (
            <div className="space-y-1 col-span-full">
              <p className="text-xs text-text-muted">Notes</p>
              <p className="text-sm text-text-secondary">{cb.completionNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Policy Evaluation */}
      <div className="p-3 bg-bg-card border border-border-primary rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-accent-blue" />
          <p className="text-xs font-medium text-text-secondary">Policy Evaluation</p>
        </div>
        {policyLoading ? (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 size={12} className="animate-spin" /> Checking policy…
          </div>
        ) : policyResult ? (
          <div>
            <div className={`flex items-center gap-1.5 text-sm font-medium ${policyResult.allowed ? 'text-status-success' : 'text-status-error'}`}>
              {policyResult.allowed ? '✓ Communication Allowed' : `✕ Blocked: ${policyResult.reason || 'Policy denied'}`}
            </div>
            {policyResult.appliedRules && policyResult.appliedRules.length > 0 && (
              <div className="mt-2 space-y-1">
                {policyResult.appliedRules.map((rule: string, i: number) => (
                  <p key={i} className="text-xs text-text-muted">• {rule}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-muted">Policy check unavailable</p>
        )}
      </div>
    </div>
  );
}
