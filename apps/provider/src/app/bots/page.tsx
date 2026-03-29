export default function BotsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">AI Bots</h1>
          <p className="text-text-secondary mt-1">Manage your AI-powered customer interaction bots</p>
        </div>
        <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          + Create Bot
        </button>
      </div>

      {/* Status Filter Chips */}
      <div className="flex gap-2 mb-6">
        {['All', 'Active', 'Draft', 'Paused', 'Archived'].map((status) => (
          <button
            key={status}
            className="px-3 py-1.5 text-xs rounded-full border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
          >
            {status}
          </button>
        ))}
      </div>

      {/* Bot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Loan Inquiry Bot', purpose: 'Handle loan pre-qualification inquiries', status: 'Active', conversations: 234, escalations: 12 },
          { name: 'Account Support Bot', purpose: 'Assist with account balance and transaction queries', status: 'Active', conversations: 567, escalations: 23 },
          { name: 'Onboarding Bot', purpose: 'Guide new customers through KYC process', status: 'Draft', conversations: 0, escalations: 0 },
        ].map((bot, i) => (
          <div key={i} className="bg-bg-card border border-border-primary rounded-xl p-5 hover:border-border-secondary transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center text-accent-purple text-sm font-medium">
                {bot.name.charAt(0)}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                bot.status === 'Active' ? 'bg-status-success/20 text-status-success' :
                bot.status === 'Draft' ? 'bg-text-muted/20 text-text-muted' :
                'bg-status-warning/20 text-status-warning'
              }`}>
                {bot.status}
              </span>
            </div>
            <h3 className="font-medium text-sm">{bot.name}</h3>
            <p className="text-xs text-text-muted mt-1">{bot.purpose}</p>
            <div className="flex gap-4 mt-4 pt-3 border-t border-border-primary">
              <div>
                <p className="text-xs text-text-muted">Conversations</p>
                <p className="text-sm font-medium">{bot.conversations}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Escalations</p>
                <p className="text-sm font-medium">{bot.escalations}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
