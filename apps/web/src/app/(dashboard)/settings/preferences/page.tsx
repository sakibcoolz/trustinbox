import Link from 'next/link';

const categories = [
  { name: 'Personal', desc: 'Direct messages and personal notifications.', status: 'Active', chip: 'chip-green', icon: '💬', bg: 'bg-accent-blue/10' },
  { name: 'Organizational', desc: 'Transactional and business communications.', status: 'Active', chip: 'chip-green', icon: '🏢', bg: 'bg-accent-purple/10' },
  { name: 'Advertisement', desc: 'Promotional content from verified organizations.', status: 'Opt-in', chip: 'chip-orange', icon: '📢', bg: 'bg-accent-orange/10' },
];

export default function PreferencesSettingsPage() {
  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Category Preferences</h1>
            <p className="text-2xs text-text-muted">Control how each notification category is handled.</p>
          </div>
        </div>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.name} className="card flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${cat.bg} flex items-center justify-center text-lg shrink-0`}>{cat.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{cat.name}</p>
                <p className="text-2xs text-text-muted mt-0.5">{cat.desc}</p>
              </div>
              <span className={cat.chip + ' text-2xs'}>{cat.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
