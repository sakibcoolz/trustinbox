import '@/app/globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TrustInbox Provider Portal',
  description: 'Service Provider dashboard for TrustInbox',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-bg-primary text-text-primary min-h-screen`}>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

function Sidebar() {
  const navItems = [
    { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
    { label: 'Customers', href: '/customers', icon: 'Users' },
    { label: 'Bots', href: '/bots', icon: 'Bot' },
    { label: 'Campaigns', href: '/campaigns', icon: 'Megaphone' },
    { label: 'Webhooks', href: '/webhooks', icon: 'Webhook' },
    { label: 'Analytics', href: '/analytics', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-bg-secondary border-r border-border-primary flex flex-col">
      <div className="p-4 border-b border-border-primary">
        <h1 className="text-lg font-semibold text-accent-blue">TrustInbox</h1>
        <p className="text-xs text-text-muted mt-0.5">Provider Portal</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <span className="w-5 h-5 flex items-center justify-center text-text-muted">
              {item.icon.charAt(0)}
            </span>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="p-4 border-t border-border-primary">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-sm font-medium">
            SP
          </div>
          <div>
            <p className="text-sm text-text-primary">Acme Corp</p>
            <p className="text-xs text-text-muted">Banking & Finance</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
