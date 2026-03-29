import Link from 'next/link';

const sections = [
  { href: '/settings/privacy', label: 'Privacy', desc: 'Control what service providers can see and do.', icon: '🔒', color: 'bg-accent-blue/10 text-accent-blue' },
  { href: '/settings/dnd', label: 'Do Not Disturb', desc: 'Set quiet hours and DND schedules.', icon: '🌙', color: 'bg-accent-purple/10 text-accent-purple' },
  { href: '/settings/availability', label: 'Availability', desc: 'Define when service providers can reach you.', icon: '🕐', color: 'bg-accent-green/10 text-accent-green' },
  { href: '/settings/preferences', label: 'Category Preferences', desc: 'Control Personal, Service Provider, and Ad notifications.', icon: '⚙️', color: 'bg-accent-orange/10 text-accent-orange' },
];

export default function SettingsPage() {
  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-muted mt-1">Control your privacy, DND rules, and communication preferences.</p>
        </div>
        <div className="space-y-3">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="card flex items-center gap-4 hover:shadow-elevated transition-shadow duration-200 group">
              <div className={`w-11 h-11 rounded-xl ${s.color} flex items-center justify-center text-lg shrink-0`}>{s.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-blue transition-colors">{s.label}</h3>
                <p className="text-2xs text-text-muted mt-0.5">{s.desc}</p>
              </div>
              <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
