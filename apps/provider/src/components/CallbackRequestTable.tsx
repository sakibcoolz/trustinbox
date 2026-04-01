'use client';

import { Fragment, useState } from 'react';
import { CallbackRequest, CallbackRequestStatus, getPriorityConfig } from '@/lib/graphql/callbacks';
import CallbackStatusBadge from '@/components/callbacks/CallbackStatusBadge';
import ExpiryIndicator from '@/components/callbacks/ExpiryIndicator';
import { formatRelativeTime } from '@/lib/format';

interface CallbackRequestTableProps {
  requests: CallbackRequest[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onComplete?: (id: string) => void;
}

export default function CallbackRequestTable({ requests, onApprove, onReject, onComplete }: CallbackRequestTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-primary text-xs text-text-muted">
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-left font-medium">Reason</th>
            <th className="px-4 py-3 text-left font-medium">Priority</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Requested</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const priorityCfg = getPriorityConfig(r.priority);
            return (
              <Fragment key={r.id}>
                <tr
                  className={`border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors cursor-pointer ${
                    expandedId === r.id ? 'bg-bg-surface' : ''
                  }`}
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{r.customerVirtualId}</td>
                  <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">{r.reason}</td>
                  <td className={`px-4 py-3 font-medium ${priorityCfg.color}`}>{priorityCfg.label}</td>
                  <td className="px-4 py-3"><CallbackStatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    <div className="space-y-1">
                      <span title={new Date(r.requestedAt).toLocaleString()}>
                        {formatRelativeTime(r.requestedAt)}
                      </span>
                      {r.status === 'PENDING' && <ExpiryIndicator requestedAt={r.requestedAt} />}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => onApprove?.(r.id)}
                            className="px-2 py-1 bg-status-success/10 text-status-success rounded text-xs font-medium hover:bg-status-success/20 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => onReject?.(r.id)}
                            className="px-2 py-1 bg-status-error/10 text-status-error rounded text-xs font-medium hover:bg-status-error/20 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'APPROVED' && (
                        <button
                          onClick={() => onComplete?.(r.id)}
                          className="px-2 py-1 bg-accent-blue/10 text-accent-blue rounded text-xs font-medium hover:bg-accent-blue/20 transition-colors"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 bg-bg-surface border-b border-border-primary">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        {r.details && (
                          <div className="col-span-2">
                            <p className="text-text-muted mb-0.5">Details</p>
                            <p className="text-text-secondary">{r.details}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-text-muted mb-0.5">Agent</p>
                          <p className="text-text-secondary">{r.assignedAgentName || 'Unassigned'}</p>
                        </div>
                        {r.approvedSlotStart && (
                          <div>
                            <p className="text-text-muted mb-0.5">Scheduled</p>
                            <p className="text-text-secondary">{new Date(r.approvedSlotStart).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {requests.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                No callback requests
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
