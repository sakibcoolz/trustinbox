const mockCallbacks = [
  { id: '1', org: 'Acme Bank', reason: 'Loan follow-up', status: 'pending' as const, time: '10 min ago' },
  { id: '2', org: 'City Hospital', reason: 'Lab results discussion', status: 'pending' as const, time: '1 hr ago' },
  { id: '3', org: 'Quick Realty', reason: 'Property viewing schedule', status: 'approved' as const, time: '2 hrs ago' },
];

const statusStyles: Record<string, string> = {
  pending: 'chip-orange',
  approved: 'chip-green',
  rejected: 'chip-red',
};

export function PendingCallbacks() {
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">Callback Requests</h2>
      <div className="space-y-3">
        {mockCallbacks.map((cb) => (
          <div key={cb.id} className="flex items-start justify-between p-3 bg-bg-tertiary rounded-md">
            <div>
              <p className="text-text-primary text-sm font-medium">{cb.org}</p>
              <p className="text-text-muted text-xs">{cb.reason} &middot; {cb.time}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={statusStyles[cb.status]}>{cb.status}</span>
              {cb.status === 'pending' && (
                <div className="flex gap-1">
                  <button className="btn-primary text-xs px-2 py-1">Approve</button>
                  <button className="btn-danger text-xs px-2 py-1">Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
