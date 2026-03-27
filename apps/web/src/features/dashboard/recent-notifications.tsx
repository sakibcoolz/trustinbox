const mockNotifications = [
  { id: '1', title: 'Account Statement Ready', org: 'Acme Bank', time: '2 min ago', category: 'Organizational' as const },
  { id: '2', title: 'Appointment Reminder', org: 'City Hospital', time: '15 min ago', category: 'Personal' as const },
  { id: '3', title: 'Exclusive Offer Inside', org: 'Quick Realty', time: '1 hr ago', category: 'Advertisement' as const },
];

const categoryChip: Record<string, string> = {
  Personal: 'chip-blue',
  Organizational: 'chip-green',
  Advertisement: 'chip-orange',
};

export function RecentNotifications() {
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">Recent Notifications</h2>
      <div className="space-y-3">
        {mockNotifications.map((n) => (
          <div key={n.id} className="flex items-start justify-between p-3 bg-bg-tertiary rounded-md">
            <div>
              <p className="text-text-primary text-sm font-medium">{n.title}</p>
              <p className="text-text-muted text-xs">{n.org} &middot; {n.time}</p>
            </div>
            <span className={categoryChip[n.category]}>{n.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
