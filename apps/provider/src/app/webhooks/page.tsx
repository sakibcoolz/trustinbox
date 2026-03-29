export default function WebhooksPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Webhooks</h1>
          <p className="text-text-secondary mt-1">Manage webhook subscriptions and monitor deliveries</p>
        </div>
        <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          + Add Webhook
        </button>
      </div>

      {/* Webhooks Table */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary">
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Endpoint</th>
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Events</th>
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Status</th>
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Deliveries</th>
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Failure Rate</th>
            </tr>
          </thead>
          <tbody>
            {[
              { url: 'https://api.acme.com/webhooks/trustinbox', events: ['notification.sent', 'callback.approved'], status: 'Active', deliveries: 1420, failureRate: '0.2%' },
              { url: 'https://crm.acme.com/events', events: ['customer.opted_in', 'customer.opted_out'], status: 'Active', deliveries: 890, failureRate: '0.0%' },
              { url: 'https://analytics.acme.com/ingest', events: ['campaign.sent', 'campaign.completed'], status: 'Paused', deliveries: 234, failureRate: '1.5%' },
            ].map((hook, i) => (
              <tr key={i} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors cursor-pointer">
                <td className="px-5 py-3">
                  <span className="text-sm font-mono text-text-primary">{hook.url}</span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {hook.events.map((e) => (
                      <span key={e} className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{e}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    hook.status === 'Active' ? 'bg-status-success/20 text-status-success' : 'bg-status-warning/20 text-status-warning'
                  }`}>
                    {hook.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm">{hook.deliveries.toLocaleString()}</td>
                <td className="px-5 py-3 text-sm text-text-muted">{hook.failureRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
