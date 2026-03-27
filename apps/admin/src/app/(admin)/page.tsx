const stats = [
  { label: 'Total Users', value: '12,487' },
  { label: 'Verified Orgs', value: '342' },
  { label: 'Pending Verifications', value: '18' },
  { label: 'Spam Reports (24h)', value: '67' },
  { label: 'Active Campaigns', value: '23' },
  { label: 'Revenue (MTD)', value: '$24,580' },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-text-secondary text-sm">{s.label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
