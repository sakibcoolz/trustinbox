'use client';

import { useState } from 'react';

const tabs = ['All', 'Personal', 'Organizational', 'Advertisements'] as const;

const mockNotifications = [
  { id: '1', title: 'Account Statement Ready', org: 'Acme Bank', time: '2 min ago', category: 'Organizational', read: false },
  { id: '2', title: 'Appointment Reminder', org: 'City Hospital', time: '15 min ago', category: 'Personal', read: false },
  { id: '3', title: 'Exclusive Offer', org: 'Quick Realty', time: '1 hr ago', category: 'Advertisements', read: true },
  { id: '4', title: 'Transfer Complete', org: 'Acme Bank', time: '2 hrs ago', category: 'Organizational', read: true },
  { id: '5', title: 'Prescription Ready', org: 'City Hospital', time: '5 hrs ago', category: 'Personal', read: true },
];

const categoryChip: Record<string, string> = {
  Personal: 'chip-blue',
  Organizational: 'chip-green',
  Advertisements: 'chip-orange',
};

export function InboxTabs() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All');

  const filtered = activeTab === 'All'
    ? mockNotifications
    : mockNotifications.filter((n) => n.category === activeTab);

  return (
    <div className="space-y-4">
      <div className="flex border-b border-border-primary">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={activeTab === t ? 'tab-active' : 'tab'}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((n) => (
          <div
            key={n.id}
            className={`flex items-start justify-between p-4 rounded-md transition-colors cursor-pointer ${
              n.read ? 'bg-bg-secondary' : 'bg-bg-tertiary border-l-2 border-accent-blue'
            } hover:bg-bg-hover`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {!n.read && <span className="w-2 h-2 bg-accent-blue rounded-full" />}
                <p className="text-text-primary text-sm font-medium">{n.title}</p>
              </div>
              <p className="text-text-muted text-xs mt-1">{n.org} &middot; {n.time}</p>
            </div>
            <span className={categoryChip[n.category]}>{n.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
