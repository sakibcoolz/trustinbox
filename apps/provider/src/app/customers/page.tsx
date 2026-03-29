export default function CustomersPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-text-secondary mt-1">Manage your customer relationships and communication preferences</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search customers..."
            className="px-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active w-64"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 mb-6">
        {['All', 'Customer', 'Subscriber', 'Lead', 'Opted Out'].map((filter) => (
          <button
            key={filter}
            className="px-3 py-1.5 text-xs rounded-full border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Customer Table */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-primary">
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Customer</th>
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Type</th>
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Last Contact</th>
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Notifications</th>
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Consent</th>
              <th className="text-left text-xs text-text-muted font-medium px-5 py-3 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Masked User #a1b2', type: 'Customer', lastContact: '2h ago', notifications: 12, consent: 'Personal + Org', status: 'Active' },
              { name: 'Masked User #c3d4', type: 'Subscriber', lastContact: '1d ago', notifications: 45, consent: 'All', status: 'Active' },
              { name: 'Masked User #e5f6', type: 'Lead', lastContact: '3d ago', notifications: 3, consent: 'Org only', status: 'Active' },
              { name: 'Masked User #g7h8', type: 'Customer', lastContact: '7d ago', notifications: 28, consent: 'None', status: 'Opted Out' },
            ].map((customer, i) => (
              <tr key={i} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors cursor-pointer">
                <td className="px-5 py-3">
                  <span className="text-sm font-medium">{customer.name}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted">{customer.type}</span>
                </td>
                <td className="px-5 py-3 text-sm text-text-muted">{customer.lastContact}</td>
                <td className="px-5 py-3 text-sm">{customer.notifications}</td>
                <td className="px-5 py-3 text-sm text-text-muted">{customer.consent}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    customer.status === 'Active' ? 'bg-status-success/20 text-status-success' : 'bg-status-error/20 text-status-error'
                  }`}>
                    {customer.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
