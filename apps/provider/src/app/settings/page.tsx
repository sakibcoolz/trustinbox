'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsCard {
  title: string;
  description: string;
  href: string;
  icon: string;
  requireAdmin?: boolean;
}

const settingsCards: SettingsCard[] = [
  {
    title: 'Profile',
    description: 'Manage organization details, contact information, and branding',
    href: '/settings/profile',
    icon: '👤',
  },
  {
    title: 'Industry',
    description: 'Configure industry-specific settings, compliance, and templates',
    href: '/settings/industry',
    icon: '🏢',
  },
  {
    title: 'Team',
    description: 'Manage agents, team members, roles, and invitations',
    href: '/settings/team',
    icon: '👥',
    requireAdmin: true,
  },
  {
    title: 'Branding',
    description: 'Customize notification templates and visual identity (coming soon)',
    href: '/settings/profile',
    icon: '🎨',
  },
];

export default function SettingsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'SP_ADMIN';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your service provider account and configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {settingsCards
          .filter((card) => !card.requireAdmin || isAdmin)
          .map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group bg-bg-card border border-border-primary rounded-xl p-6 hover:border-accent-blue/40 hover:shadow-lg hover:shadow-accent-blue/5 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{card.icon}</span>
                  <div>
                    <h3 className="font-semibold group-hover:text-accent-blue transition-colors">{card.title}</h3>
                    <p className="text-sm text-text-muted mt-1">{card.description}</p>
                  </div>
                </div>
                <span className="text-text-muted group-hover:text-accent-blue group-hover:translate-x-0.5 transition-all mt-1">→</span>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
