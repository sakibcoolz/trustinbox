'use client';

import { useState } from 'react';
import { X, CheckCircle2, Calendar } from 'lucide-react';
import { CallbackOutcome, useCompleteCallbackRequest } from '@/lib/graphql/callbacks';
import { useToast } from '@/components/Toast';

interface CompleteCallbackModalProps {
  callbackId: string;
  isOpen: boolean;
  onClose: () => void;
}

const outcomeOptions: Array<{ value: CallbackOutcome; label: string }> = [
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'FOLLOW_UP', label: 'Follow-up Needed' },
  { value: 'NO_ANSWER', label: 'No Answer' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
];

export default function CompleteCallbackModal({ callbackId, isOpen, onClose }: CompleteCallbackModalProps) {
  const [outcome, setOutcome] = useState<CallbackOutcome>('RESOLVED');
  const [callDuration, setCallDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const { complete, loading } = useCompleteCallbackRequest();
  const { success, error: toastError } = useToast();

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await complete({
        callbackRequestId: callbackId,
        outcome,
        callDuration: callDuration ? parseInt(callDuration, 10) : undefined,
        notes: notes || undefined,
        followUpDate: followUpDate || undefined,
      });
      success('Callback marked as complete');
      onClose();
    } catch {
      toastError('Failed to complete callback');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-elevated border border-border-primary rounded-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-status-success" /> Complete Callback
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover transition-colors">
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Outcome */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Outcome *</label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as CallbackOutcome)}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active"
            >
              {outcomeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Call Duration */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Call Duration (minutes)</label>
            <input
              type="number"
              min="0"
              value={callDuration}
              onChange={(e) => setCallDuration(e.target.value)}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active"
              placeholder="e.g. 15"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary resize-none focus:outline-none focus:border-border-active"
              placeholder="Summary of the call…"
            />
            <p className="text-xs text-text-muted mt-1 text-right">{notes.length}/500</p>
          </div>

          {/* Follow-up Date (conditional) */}
          {outcome === 'FOLLOW_UP' && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                <Calendar size={12} className="inline mr-1" /> Follow-up Date *
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (outcome === 'FOLLOW_UP' && !followUpDate)}
            className="w-full py-2.5 bg-status-success text-white rounded-lg text-sm font-medium hover:bg-status-success/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={14} /> Mark Complete
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
