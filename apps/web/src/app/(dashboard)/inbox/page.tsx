'use client';

import { useState } from 'react';

const tabs = ['All', 'Personal', 'Business', 'Ads'] as const;

interface Notification {
  id: string;
  title: string;
  body: string;
  org: string;
  orgSlug: string;
  time: string;
  category: 'Personal' | 'Business' | 'Ads';
  read: boolean;
  priority: 'normal' | 'high' | 'urgent';
  icon: 'bell' | 'doc' | 'payment' | 'alert' | 'promo';
}

const notifications: Notification[] = [
  { id: '1', title: 'Loan Application Approved', body: 'Your personal loan of ₹5,00,000 has been approved at 10.5% p.a. Please review and sign the agreement within 7 days.', org: 'Acme Bank', orgSlug: 'o/acmebank', time: '2m ago', category: 'Business', read: false, priority: 'high', icon: 'payment' },
  { id: '2', title: 'Lab Results Available', body: 'Your blood test results from March 25 are now ready. Most values are within normal range. Vitamin D levels need attention.', org: 'City Hospital', orgSlug: 'o/cityhospital', time: '15m ago', category: 'Personal', read: false, priority: 'normal', icon: 'doc' },
  { id: '3', title: 'New Property Listings', body: '3 new properties matching your criteria: 2BHK Downtown ₹85L, 3BHK Whitefield ₹1.2Cr, 2BHK Indiranagar ₹95L.', org: 'Quick Realty', orgSlug: 'o/quickrealty', time: '1h ago', category: 'Ads', read: false, priority: 'normal', icon: 'promo' },
  { id: '4', title: 'Transaction Alert', body: 'UPI payment of ₹15,000 to HDFC Credit Card successful. Transaction ID: TXN892716352. Balance: ₹2,45,000.', org: 'SecurePay', orgSlug: 'o/securepay', time: '3h ago', category: 'Business', read: true, priority: 'normal', icon: 'payment' },
  { id: '5', title: 'Appointment Reminder', body: 'Your follow-up appointment with Dr. Sharma is scheduled for March 30, 2026 at 10:00 AM. Please arrive 15 minutes early.', org: 'City Hospital', orgSlug: 'o/cityhospital', time: '5h ago', category: 'Personal', read: true, priority: 'normal', icon: 'bell' },
  { id: '6', title: 'Insurance Renewal Due', body: 'Your health insurance policy #MCP-29381 expires on April 12. Renew now to avoid coverage gap. Early renewal discount: 5%.', org: 'MediCare Plus', orgSlug: 'o/medicareplus', time: '1d ago', category: 'Personal', read: true, priority: 'high', icon: 'alert' },
  { id: '7', title: 'Credit Card Statement', body: 'Your March statement is ready. Total due: ₹42,350. Minimum due: ₹2,118. Due date: April 15, 2026.', org: 'Acme Bank', orgSlug: 'o/acmebank', time: '1d ago', category: 'Business', read: true, priority: 'normal', icon: 'doc' },
  { id: '8', title: 'Exclusive Home Loan Offer', body: 'Pre-approved home loan up to ₹1Cr at 8.5% p.a. Zero processing fee for existing customers. Offer valid till April 30.', org: 'Acme Bank', orgSlug: 'o/acmebank', time: '2d ago', category: 'Ads', read: true, priority: 'normal', icon: 'promo' },
];

const categoryChip: Record<string, string> = {
  Personal: 'chip-blue',
  Business: 'chip-green',
  Ads: 'chip-orange',
};

const priorityIndicator: Record<string, string> = {
  normal: '',
  high: 'border-l-accent-orange',
  urgent: 'border-l-accent-red',
};

const iconMap: Record<string, React.ReactNode> = {
  bell: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
  doc: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  payment: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
  alert: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  promo: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>,
};

const iconBg: Record<string, string> = {
  bell: 'bg-accent-blue/15 text-accent-blue',
  doc: 'bg-accent-purple/15 text-accent-purple',
  payment: 'bg-accent-green/15 text-accent-green',
  alert: 'bg-accent-orange/15 text-accent-orange',
  promo: 'bg-accent-pink/15 text-accent-pink',
};

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = activeTab === 'All'
    ? notifications
    : notifications.filter((n) => n.category === activeTab);

  const selected = notifications.find((n) => n.id === selectedId) || null;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Notification list panel */}
      <div className="w-panel h-full flex flex-col bg-bg-secondary border-r border-border-primary shrink-0">
        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text-primary">Inbox</h2>
              {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button className="btn-icon" title="Mark all read">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button className="btn-icon" title="Filter">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
                  activeTab === t
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 border-l-2 ${
                selectedId === n.id
                  ? 'bg-bg-active border-l-accent-blue'
                  : `${priorityIndicator[n.priority] || 'border-l-transparent'} hover:bg-bg-hover`
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${iconBg[n.icon]} flex items-center justify-center shrink-0 mt-0.5`}>
                {iconMap[n.icon]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm font-medium truncate ${!n.read ? 'text-text-primary' : 'text-text-secondary'}`}>{n.title}</span>
                  <span className="text-2xs text-text-muted shrink-0 ml-2">{n.time}</span>
                </div>
                <p className="text-xs text-text-muted truncate">{n.org}</p>
                <p className={`text-xs mt-0.5 truncate ${!n.read ? 'text-text-secondary' : 'text-text-muted'}`}>{n.body}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-accent-blue shrink-0 mt-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-bg-primary min-w-0 overflow-hidden">
          {/* Detail header */}
          <div className="h-[60px] px-6 flex items-center justify-between border-b border-border-primary bg-bg-secondary/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${iconBg[selected.icon]} flex items-center justify-center`}>
                {iconMap[selected.icon]}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{selected.org}</h3>
                <p className="text-2xs text-text-muted">{selected.orgSlug} · {selected.time}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="btn-icon" title="Reply"><svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg></button>
              <button className="btn-icon" title="Archive"><svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg></button>
              <button className="btn-icon" title="Delete"><svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
            </div>
          </div>

          {/* Detail body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
                <span className={categoryChip[selected.category]}>{selected.category}</span>
                {selected.priority !== 'normal' && (
                  <span className={selected.priority === 'urgent' ? 'chip-red' : 'chip-orange'}>
                    {selected.priority === 'urgent' ? 'Urgent' : 'Important'}
                  </span>
                )}
              </div>

              <h1 className="text-xl font-semibold text-text-primary">{selected.title}</h1>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-accent-green flex items-center justify-center text-white text-xs font-semibold">
                  {selected.org[0]}
                </div>
                <span className="text-text-primary font-medium">{selected.org}</span>
                <span className="text-text-muted">·</span>
                <span className="text-text-muted">{selected.time}</span>
              </div>

              <div className="h-px bg-border-primary" />

              <div className="text-sm text-text-secondary leading-relaxed space-y-4">
                <p>{selected.body}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="btn-primary">Reply</button>
                <button className="btn-secondary">Archive</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-bg-primary">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-bg-tertiary mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 014.5 4.5h15A2.25 2.25 0 0121.75 6.75v6.75m-17.5 0v4.5A2.25 2.25 0 006.5 20h11a2.25 2.25 0 002.25-2.25v-4.5" />
              </svg>
            </div>
            <p className="text-sm text-text-muted">Select a notification to view details</p>
          </div>
        </div>
      )}
    </>
  );
}
