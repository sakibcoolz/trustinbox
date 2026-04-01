'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Loader2, PhoneCall } from 'lucide-react';
import Link from 'next/link';
import {
  CallbackPriority,
  useCreateCallbackRequest,
  useCheckCallbackPolicy,
} from '@/lib/graphql/callbacks';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/components/Toast';

const priorityOptions: Array<{ value: CallbackPriority; label: string; color: string }> = [
  { value: 'LOW', label: 'Low', color: 'text-text-muted' },
  { value: 'NORMAL', label: 'Normal', color: 'text-text-secondary' },
  { value: 'HIGH', label: 'High', color: 'text-accent-orange' },
  { value: 'URGENT', label: 'Urgent', color: 'text-status-error' },
];

function CreateCallbackForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const canManage = usePermission('callbacks:manage');
  const { success, error: toastError } = useToast();
  const spId = user?.activeServiceProvider?.id ?? '';

  const recipientVid = searchParams.get('recipient') ?? '';
  const [userId, setUserId] = useState(recipientVid);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<CallbackPriority>('NORMAL');
  const [showConfirm, setShowConfirm] = useState(false);

  const { create, loading: creating } = useCreateCallbackRequest();
  const { checkPolicy, result: policyResult, loading: policyLoading } = useCheckCallbackPolicy();

  function handleCustomerBlur() {
    if (userId && spId) {
      checkPolicy(spId, userId);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    try {
      await create({
        userId,
        reason,
        details: details || undefined,
        priority,
      });
      success('Callback request created');
      router.push('/callbacks');
    } catch {
      toastError('Failed to create callback request');
    }
  }

  if (!canManage) {
    return (
      <div className="p-8 text-center">
        <p className="text-text-muted">You do not have permission to create callback requests.</p>
        <Link href="/callbacks" className="text-accent-blue text-sm hover:underline mt-2 inline-block">
          Back to Callbacks
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/callbacks" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
          <ArrowLeft size={18} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Create Callback Request</h1>
          <p className="text-text-secondary text-sm mt-0.5">Schedule a callback with a customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer ID */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Customer Virtual ID *</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onBlur={handleCustomerBlur}
            required
            className="w-full px-3 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active font-mono"
            placeholder="VID-xxxxxxxx"
          />
        </div>

        {/* Policy Check Result */}
        {(policyLoading || policyResult) && (
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${
            policyLoading ? 'bg-bg-card border-border-primary' :
            policyResult?.allowed ? 'bg-status-success/5 border-status-success/20' : 'bg-status-error/5 border-status-error/20'
          }`}>
            {policyLoading ? (
              <>
                <Loader2 size={14} className="animate-spin text-text-muted" />
                <span className="text-xs text-text-muted">Checking policy…</span>
              </>
            ) : (
              <>
                <Shield size={14} className={policyResult?.allowed ? 'text-status-success' : 'text-status-error'} />
                <span className={`text-xs font-medium ${policyResult?.allowed ? 'text-status-success' : 'text-status-error'}`}>
                  {policyResult?.allowed ? 'Callback allowed' : `Blocked: ${policyResult?.reason || 'Policy denied'}`}
                </span>
              </>
            )}
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Reason *</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            maxLength={200}
            className="w-full px-3 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Reason for the callback"
          />
          <p className="text-xs text-text-muted mt-1 text-right">{reason.length}/200</p>
        </div>

        {/* Details */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Details</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full px-3 py-2.5 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary resize-none placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="Additional details or context…"
          />
          <p className="text-xs text-text-muted mt-1 text-right">{details.length}/1000</p>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Priority *</label>
          <div className="flex gap-2">
            {priorityOptions.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  priority === p.value
                    ? 'bg-accent-blue/10 border-accent-blue text-accent-blue'
                    : 'border-border-secondary text-text-muted hover:border-border-active hover:text-text-secondary'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Confirmation */}
        {showConfirm && (
          <div className="p-4 bg-bg-card border border-border-primary rounded-lg space-y-3">
            <p className="text-sm font-medium">Confirm Callback Request</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-text-muted">Customer</p>
                <p className="font-mono text-text-primary">{userId}</p>
              </div>
              <div>
                <p className="text-text-muted">Priority</p>
                <p className="text-text-primary">{priority}</p>
              </div>
              <div className="col-span-2">
                <p className="text-text-muted">Reason</p>
                <p className="text-text-primary">{reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Link
            href="/callbacks"
            className="flex-1 py-2.5 text-center border border-border-secondary rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={creating || !userId || !reason || !!(policyResult && !policyResult.allowed)}
            className="flex-1 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <PhoneCall size={14} /> {showConfirm ? 'Submit Request' : 'Create Request'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateCallbackPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-2xl mx-auto">
        <div className="h-8 w-64 bg-bg-card rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-bg-card rounded animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <CreateCallbackForm />
    </Suspense>
  );
}
