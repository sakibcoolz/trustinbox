export default function CampaignsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-text-secondary mt-1">Create and manage notification campaigns</p>
        </div>
        <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          + New Campaign
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 mb-6">
        {['All', 'Draft', 'Scheduled', 'In Progress', 'Completed'].map((filter) => (
          <button
            key={filter}
            className="px-3 py-1.5 text-xs rounded-full border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Campaign Cards */}
      <div className="space-y-4">
        {[
          { name: 'Q4 Loan Offers', type: 'Personal', status: 'In Progress', targets: 1250, delivered: 980, optOuts: 12, date: 'Dec 1, 2024' },
          { name: 'New Feature Announcement', type: 'Organizational', status: 'Completed', targets: 3400, delivered: 3350, optOuts: 3, date: 'Nov 15, 2024' },
          { name: 'Holiday Promotion', type: 'Advertisement', status: 'Draft', targets: 0, delivered: 0, optOuts: 0, date: 'Dec 20, 2024' },
        ].map((campaign, i) => (
          <div key={i} className="bg-bg-card border border-border-primary rounded-xl p-5 hover:border-border-secondary transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="font-medium text-sm">{campaign.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue">{campaign.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      campaign.status === 'Completed' ? 'bg-status-success/20 text-status-success' :
                      campaign.status === 'In Progress' ? 'bg-accent-orange/20 text-accent-orange' :
                      'bg-text-muted/20 text-text-muted'
                    }`}>
                      {campaign.status}
                    </span>
                    <span className="text-xs text-text-muted">{campaign.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-text-muted">Targets</p>
                  <p className="text-sm font-medium">{campaign.targets.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted">Delivered</p>
                  <p className="text-sm font-medium">{campaign.delivered.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted">Opt-Outs</p>
                  <p className="text-sm font-medium">{campaign.optOuts}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
