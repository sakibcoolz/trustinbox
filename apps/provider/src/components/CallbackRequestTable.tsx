'use client';

import { useState } from 'react';
import { Clock, CheckCircle2, XCircle, PhoneMissed, Calendar } from 'lucide-react';

interface CallbackRequest {
  id: string;
  customerVid: string;
  topic: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  status: 'Pending' | 'Approved' | 'Completed' | 'Missed' | 'Rejected';
  requestedAt: string;
  scheduledAt: string | null;
}

interface CallbackRequestTableProps {
  requests?: CallbackRequest[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

const defaultRequests: CallbackRequest[] = [
  { id: '1', customerVid: 'VID-8a3f2b', topic: 'Account inquiry', priority: 'High', status: 'Pending', requestedAt: '2024-03-10 11:30', scheduledAt: null },
  { id: '2', customerVid: 'VID-4c9e1d', topic: 'Billing dispute', priority: 'Urgent', status: 'Pending', requestedAt: '2024-03-10 10:15', scheduledAt: null },
  { id: '3', customerVid: 'VID-7f2a8c', topic: 'Technical support', priority: 'Normal', status: 'Approved', requestedAt: '2024-03-09 14:30', scheduledAt: '2024-03-10 15:00' },
];

const statusIcons = {
  Pending: Clock,
  Approved: Calendar,
  Completed: CheckCircle2,
  Missed: PhoneMissed,
  Rejected: XCircle,
};

const statusColors: Record<string, string> = {
  Pending: 'bg-status-warning/10 text-status-warning',
  Approved: 'bg-accent-blue/10 text-accent-blue',
  Completed: 'bg-status-success/10 text-status-success',
  Missed: 'bg-status-error/10 text-status-error',
  Rejected: 'bg-border-secondary text-text-muted',
};

const priorityColors: Record<string, string> = {
  Low: 'text-text-muted',
  Normal: 'text-text-secondary',
  High: 'text-accent-orange',
  Urgent: 'text-status-error',
};

export default function CallbackRequestTable({ requests = defaultRequests, onApprove, onReject }: CallbackRequestTableProps) {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-primary text-xs text-text-muted">
            <th className="px-4 py-3 text-left font-medium">Customer</th>
            <th className="px-4 py-3 text-left font-medium">Topic</th>
            <th className="px-4 py-3 text-left font-medium">Priority</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Requested</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const StatusIcon = statusIcons[r.status];
            return (
              <tr key={r.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3 font-medium">{r.customerVid}</td>
                <td className="px-4 py-3 text-text-secondary">{r.topic}</td>
                <td className={`px-4 py-3 font-medium ${priorityColors[r.priority]}`}>{r.priority}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status]}`}>
                    <StatusIcon size={12} /> {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{r.requestedAt}</td>
                <td className="px-4 py-3">
                  {r.status === 'Pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => onApprove?.(r.id)}
                        className="px-2.5 py-1 bg-status-success/10 text-status-success rounded text-xs font-medium hover:bg-status-success/20 transition-colors">
                        Approve
                      </button>
                      <button onClick={() => onReject?.(r.id)}
                        className="px-2.5 py-1 bg-status-error/10 text-status-error rounded text-xs font-medium hover:bg-status-error/20 transition-colors">
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
