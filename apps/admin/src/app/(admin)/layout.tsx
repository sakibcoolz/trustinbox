'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/service-providers', label: 'Service Providers' },
  { href: '/spam-reports', label: 'Spam Reports' },
  { href: '/audit-logs', label: 'Audit Logs' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/billing', label: 'Billing' },
  { href: '/analytics', label: 'Analytics' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-bg-secondary border-r border-border-primary flex flex-col">
        <div className="p-4 border-b border-border-primary">
          <h1 className="text-lg font-bold text-text-primary">TI Admin</h1>
          <p className="text-xs text-text-muted">Platform Management</p>
        </div>
        <nav className="flex-1 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-bg-active text-text-primary border-l-2 border-accent-blue'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary border-l-2 border-transparent'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
