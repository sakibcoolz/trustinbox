export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-text-secondary mt-1">Communication performance and trends</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              className="px-3 py-1.5 text-xs rounded-lg border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Delivery Rate', value: '97.2%', color: 'text-status-success' },
          { label: 'Approval Rate', value: '84.5%', color: 'text-accent-blue' },
          { label: 'Completion Rate', value: '91.3%', color: 'text-accent-green' },
          { label: 'Escalation Rate', value: '5.2%', color: 'text-status-warning' },
          { label: 'Opt-Out Rate', value: '1.8%', color: 'text-status-error' },
          { label: 'Satisfaction', value: '4.6/5', color: 'text-accent-purple' },
        ].map((card, i) => (
          <div key={i} className="bg-bg-card border border-border-primary rounded-xl p-4 text-center">
            <p className="text-xs text-text-muted">{card.label}</p>
            <p className={`text-xl font-semibold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Notification Analytics</h3>
          <div className="space-y-3">
            <AnalyticsRow label="Sent" value="18,542" />
            <AnalyticsRow label="Delivered" value="18,022" />
            <AnalyticsRow label="Failed" value="520" />
            <AnalyticsRow label="Avg Delivery Time" value="1.2s" />
          </div>
        </div>

        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Callback Analytics</h3>
          <div className="space-y-3">
            <AnalyticsRow label="Requested" value="3,201" />
            <AnalyticsRow label="Approved" value="2,705" />
            <AnalyticsRow label="Completed" value="2,470" />
            <AnalyticsRow label="Denied" value="496" />
          </div>
        </div>

        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Campaign Analytics</h3>
          <div className="space-y-3">
            <AnalyticsRow label="Total Campaigns" value="24" />
            <AnalyticsRow label="Targeted Users" value="8,542" />
            <AnalyticsRow label="Delivered" value="8,301" />
            <AnalyticsRow label="Opt-Outs" value="154" />
          </div>
        </div>

        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h3 className="text-sm font-medium text-text-secondary mb-4">Bot Analytics</h3>
          <div className="space-y-3">
            <AnalyticsRow label="Conversations" value="801" />
            <AnalyticsRow label="Actions Executed" value="2,340" />
            <AnalyticsRow label="Escalations" value="42" />
            <AnalyticsRow label="Avg Response Time" value="0.8s" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
