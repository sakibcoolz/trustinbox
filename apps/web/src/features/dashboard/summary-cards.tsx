const summaryItems = [
  { label: 'Unread Notifications', value: '12', color: 'text-accent-blue' },
  { label: 'Pending Callbacks', value: '3', color: 'text-accent-orange' },
  { label: 'Active Conversations', value: '5', color: 'text-accent-green' },
  { label: 'Spam Blocked', value: '27', color: 'text-accent-red' },
];

export function DashboardSummaryCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {summaryItems.map((item) => (
        <div key={item.label} className="card">
          <p className="text-text-secondary text-sm">{item.label}</p>
          <p className={`text-3xl font-bold mt-1 ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
