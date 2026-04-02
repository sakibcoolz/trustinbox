'use client';

import { Campaign } from '@/lib/graphql/campaigns';

interface CampaignProgressBarProps {
  campaign: Campaign;
  showLive?: boolean;
}

export default function CampaignProgressBar({ campaign, showLive }: CampaignProgressBarProps) {
  const targetCount = campaign.targetCount ?? 0;
  const sentCount = campaign.sentCount ?? 0;
  const deliveredCount = campaign.deliveredCount ?? 0;
  const failedCount = campaign.failedCount ?? 0;
  const readCount = campaign.readCount ?? 0;
  const { status } = campaign;

  if (status === 'DRAFT_CAMPAIGN' || status === 'SCHEDULED') return null;

  const total = targetCount || 1;
  const delivered = (deliveredCount / total) * 100;
  const inTransit = ((sentCount - deliveredCount) / total) * 100;
  const failed = (failedCount / total) * 100;
  const remaining = 100 - delivered - Math.max(0, inTransit) - failed;
  const deliveryRate = targetCount > 0 ? ((deliveredCount / targetCount) * 100).toFixed(1) : '0.0';

  const rateColor =
    parseFloat(deliveryRate) > 90 ? 'text-status-success' :
    parseFloat(deliveryRate) > 50 ? 'text-accent-orange' :
    'text-status-error';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-secondary">Delivery Progress</span>
          {showLive && status === 'RUNNING' && (
            <span className="flex items-center gap-1 text-xs text-status-success">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              Live
            </span>
          )}
        </div>
        <span className={`text-sm font-semibold ${rateColor}`}>{deliveryRate}%</span>
      </div>

      <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden flex">
        {delivered > 0 && (
          <div
            className="h-full bg-status-success transition-all duration-500"
            style={{ width: `${delivered}%` }}
            title={`Delivered: ${deliveredCount.toLocaleString()}`}
          />
        )}
        {inTransit > 0 && (
          <div
            className="h-full bg-accent-blue transition-all duration-500"
            style={{ width: `${Math.max(0, inTransit)}%` }}
            title={`In transit: ${(sentCount - deliveredCount).toLocaleString()}`}
          />
        )}
        {failed > 0 && (
          <div
            className="h-full bg-status-error transition-all duration-500"
            style={{ width: `${failed}%` }}
            title={`Failed: ${failedCount.toLocaleString()}`}
          />
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-status-success" />
          Delivered {deliveredCount.toLocaleString()}
        </span>
        {readCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-purple" />
            Read {readCount.toLocaleString()}
          </span>
        )}
        {sentCount - deliveredCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent-blue" />
            In Transit {(sentCount - deliveredCount).toLocaleString()}
          </span>
        )}
        {failedCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-status-error" />
            Failed {failedCount.toLocaleString()}
          </span>
        )}
        <span className="ml-auto">Target {targetCount.toLocaleString()}</span>
      </div>
    </div>
  );
}
