export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-text-secondary mt-1">Overview of your communication metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="Active Customers" value="2,347" change="+12%" positive />
        <KPICard label="Notifications Sent" value="18,542" change="+8%" positive />
        <KPICard label="Policy Denials" value="142" change="-3%" positive />
        <KPICard label="Callback Completion" value="89%" change="+2%" positive />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Notifications (30d)</h3>
          <div className="h-48 flex items-center justify-center text-text-muted text-sm">
            Chart placeholder — connect to analytics API
          </div>
        </div>
        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Callbacks (30d)</h3>
          <div className="h-48 flex items-center justify-center text-text-muted text-sm">
            Chart placeholder — connect to analytics API
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-6">
        <h3 className="text-sm font-medium text-text-secondary mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'Notification delivered', target: 'user_a1b2c3', time: '2m ago', status: 'success' },
            { action: 'Callback approved', target: 'user_d4e5f6', time: '8m ago', status: 'success' },
            { action: 'Policy denied', target: 'user_g7h8i9', time: '15m ago', status: 'error' },
            { action: 'Bot escalated', target: 'conv_j0k1l2', time: '22m ago', status: 'warning' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border-primary last:border-0">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  item.status === 'success' ? 'bg-status-success' :
                  item.status === 'error' ? 'bg-status-error' : 'bg-status-warning'
                }`} />
                <span className="text-sm">{item.action}</span>
                <span className="text-xs text-text-muted font-mono">{item.target}</span>
              </div>
              <span className="text-xs text-text-muted">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, change, positive }: {
  label: string; value: string; change: string; positive: boolean;
}) {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-5">
      <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <span className="text-2xl font-semibold">{value}</span>
        <span className={`text-xs font-medium ${positive ? 'text-status-success' : 'text-status-error'}`}>
          {change}
        </span>
      </div>
    </div>
  );
}
