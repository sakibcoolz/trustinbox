import '@/app/globals.css';
import { Inter } from 'next/font/google';
import {
  LayoutDashboard, Users, Bot, Megaphone, Webhook, BarChart3, Settings,
  Bell, MessageSquare, PhoneCall, FileText, Shield, Plug, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

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

const mainNav = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Conversations', href: '/conversations', icon: MessageSquare },
  { label: 'Callbacks', href: '/callbacks', icon: PhoneCall },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { label: 'Bots', href: '/bots', icon: Bot },
];

const bottomNav = [
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Webhooks', href: '/webhooks', icon: Webhook },
  { label: 'Compliance', href: '/compliance', icon: Shield },
  { label: 'Integrations', href: '/integrations', icon: Plug },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-bg-secondary border-r border-border-primary flex flex-col shrink-0">
      <div className="p-4 border-b border-border-primary">
        <h1 className="text-lg font-semibold text-accent-blue">TrustInbox</h1>
        <p className="text-xs text-text-muted mt-0.5">Provider Portal</p>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Main</p>
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Icon size={16} className="text-text-muted shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Platform</p>
        {bottomNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              <Icon size={16} className="text-text-muted shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-primary">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-sm font-medium">
            SP
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary truncate">Acme Corp</p>
            <p className="text-xs text-text-muted">Banking &amp; Finance</p>
          </div>
          <ChevronDown size={14} className="text-text-muted" />
        </div>
      </div>
    </aside>
  );
}
