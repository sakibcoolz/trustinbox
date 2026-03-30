export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your service provider account and integrations</p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Service Provider Profile */}
        <section className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Service Provider Profile</h2>
          <div className="space-y-4">
            <SettingsField label="Service Provider Name" value="Acme Corp" />
            <SettingsField label="Industry Profile" value="Banking & Finance" />
            <SettingsField label="Verification Status" value="Verified" badge />
            <SettingsField label="Tenant" value="default" />
          </div>
        </section>

        {/* API Keys */}
        <section className="bg-bg-card border border-border-primary rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">API Keys</h2>
            <button className="text-xs text-accent-blue hover:underline">Generate New Key</button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border-primary">
              <div>
                <p className="text-sm font-medium">Production Key</p>
                <p className="text-xs text-text-muted font-mono">ti_live_****...****a1b2</p>
              </div>
              <span className="text-xs text-text-muted">Created Dec 1, 2024</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Test Key</p>
                <p className="text-xs text-text-muted font-mono">ti_test_****...****c3d4</p>
              </div>
              <span className="text-xs text-text-muted">Created Nov 20, 2024</span>
            </div>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="bg-bg-card border border-border-primary rounded-xl p-6">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">Defaults</h2>
          <div className="space-y-4">
            <SettingsField label="Default Bot Tone" value="Professional" />
            <SettingsField label="Max Retries (webhooks)" value="5" />
            <SettingsField label="Callback Auto-Approve" value="Disabled" />
            <SettingsField label="Ad Frequency Limit" value="3 per day" />
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsField({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text-muted">{label}</span>
      {badge ? (
        <span className="text-xs px-2 py-0.5 rounded-full bg-status-success/20 text-status-success">{value}</span>
      ) : (
        <span className="text-sm">{value}</span>
      )}
    </div>
  );
}
