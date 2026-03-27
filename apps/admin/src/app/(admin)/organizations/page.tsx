const mockOrgs = [
  { id: '1', name: 'Acme Bank', domain: 'acmebank.com', status: 'verified' as const, users: 45 },
  { id: '2', name: 'City Hospital', domain: 'cityhospital.org', status: 'verified' as const, users: 120 },
  { id: '3', name: 'Quick Realty', domain: 'quickrealty.com', status: 'pending' as const, users: 8 },
  { id: '4', name: 'TechCorp', domain: 'techcorp.io', status: 'suspended' as const, users: 30 },
];

const statusStyles: Record<string, string> = {
  verified: 'chip-green',
  pending: 'chip-orange',
  rejected: 'chip-red',
  suspended: 'chip-purple',
};

export default function OrganizationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Organizations</h1>
        <input type="text" placeholder="Search organizations..." className="input-field w-64 text-sm" />
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary bg-bg-tertiary">
              <th className="text-left p-3 text-text-secondary font-medium">Name</th>
              <th className="text-left p-3 text-text-secondary font-medium">Domain</th>
              <th className="text-left p-3 text-text-secondary font-medium">Status</th>
              <th className="text-left p-3 text-text-secondary font-medium">Users</th>
              <th className="text-left p-3 text-text-secondary font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockOrgs.map((org) => (
              <tr key={org.id} className="border-b border-border-primary hover:bg-bg-hover">
                <td className="p-3 text-text-primary font-medium">{org.name}</td>
                <td className="p-3 text-text-secondary">{org.domain}</td>
                <td className="p-3"><span className={statusStyles[org.status]}>{org.status}</span></td>
                <td className="p-3 text-text-secondary">{org.users}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {org.status === 'pending' && <button className="btn-primary text-xs px-2 py-1">Verify</button>}
                    {org.status === 'verified' && <button className="btn-danger text-xs px-2 py-1">Suspend</button>}
                    {org.status === 'suspended' && <button className="btn-secondary text-xs px-2 py-1">Reinstate</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
