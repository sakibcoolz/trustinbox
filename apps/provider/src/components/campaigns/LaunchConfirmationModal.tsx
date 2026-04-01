'use client';

import { useState } from 'react';
import { Rocket, AlertTriangle, Loader2 } from 'lucide-react';
import { useLaunchCampaign, getCategoryConfig, CampaignPolicyPreview } from '@/lib/graphql/campaigns';
import { useToast } from '@/components/Toast';

interface LaunchConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  category: string;
  scheduledAt?: string | null;
  policyPreview?: CampaignPolicyPreview | null;
  serviceProviderId: string;
  onLaunched?: () => void;
}

export default function LaunchConfirmationModal({
  isOpen,
  onClose,
  campaignId,
  campaignName,
  category,
  scheduledAt,
  policyPreview,
  serviceProviderId,
  onLaunched,
}: LaunchConfirmationModalProps) {
  const { launch, loading } = useLaunchCampaign();
  const { success, error: toastError } = useToast();

  async function handleLaunch() {
    try {
      await launch(campaignId, serviceProviderId);
      success('Campaign launched successfully');
      onClose();
      onLaunched?.();
    } catch {
      toastError('Failed to launch campaign');
    }
  }

  if (!isOpen) return null;

  const catConfig = getCategoryConfig(category as any);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border-primary rounded-xl w-full max-w-lg mx-4 shadow-xl">
        <div className="flex items-center gap-3 p-6 border-b border-border-primary">
          <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center">
            <Rocket size={20} className="text-accent-blue" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Launch Campaign</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-bg-hover text-text-muted">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">You are about to launch:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">■</span>
                <span className="text-sm font-medium">&ldquo;{campaignName}&rdquo;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">■</span>
                <span className="text-sm text-text-secondary">Category:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${catConfig.className}`}>{catConfig.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">■</span>
                <span className="text-sm text-text-secondary">Schedule:</span>
                <span className="text-sm">{scheduledAt ? new Date(scheduledAt).toLocaleString() : 'Immediately'}</span>
              </div>
            </div>
          </div>

          {policyPreview && (
            <div className="p-4 bg-bg-card border border-border-primary rounded-lg space-y-2">
              <p className="text-xs font-semibold text-text-secondary">Policy Summary</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-success" />
                  <span className="text-sm text-status-success font-medium">{policyPreview.allowedCount.toLocaleString()} will receive</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-error" />
                  <span className="text-sm text-status-error font-medium">{policyPreview.blockedCount.toLocaleString()} blocked</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-status-warning/5 border border-status-warning/20 rounded-lg">
            <AlertTriangle size={16} className="text-status-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-status-warning">This action cannot be undone.</p>
              <p className="text-xs text-text-muted mt-0.5">Active campaigns can only be cancelled.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-border-primary">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border border-border-secondary rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={loading}
            className="flex-1 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <Rocket size={14} /> Launch Campaign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
