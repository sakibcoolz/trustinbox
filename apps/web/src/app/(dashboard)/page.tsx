'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const stats = [
  { label: 'Unread', value: 12, color: 'text-accent-blue', bg: 'bg-accent-blue/10', href: '/inbox' },
  { label: 'Pending Calls', value: 3, color: 'text-accent-orange', bg: 'bg-accent-orange/10', href: '/callbacks' },
  { label: 'Organizations', value: 6, color: 'text-accent-purple', bg: 'bg-accent-purple/10', href: '/organizations' },
  { label: 'Documents', value: 2, color: 'text-accent-green', bg: 'bg-accent-green/10', href: '/documents' },
];

const recentActivity = [
  { id: '1', icon: '💬', text: 'New message from Acme Bank', time: '2m ago', color: 'bg-accent-blue/10' },
  { id: '2', icon: '📞', text: 'Callback request from City Hospital', time: '15m ago', color: 'bg-accent-orange/10' },
  { id: '3', icon: '📄', text: 'Document shared by MediCare Plus', time: '1h ago', color: 'bg-accent-green/10' },
  { id: '4', icon: '🔔', text: 'Payment reminder from SecurePay', time: '3h ago', color: 'bg-accent-purple/10' },
  { id: '5', icon: '✅', text: 'Callback with Quick Realty completed', time: '5h ago', color: 'bg-accent-cyan/10' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-text-muted mt-1">Here&apos;s your communication overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Link key={s.label} href={s.href} className="card hover:shadow-elevated transition-shadow duration-200 group">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
              </div>
              <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">{s.label}</p>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">Recent Activity</h2>
            <Link href="/inbox" className="text-2xs text-accent-blue hover:underline">View all</Link>
          </div>
          <div className="space-y-1">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-bg-hover transition-colors cursor-pointer">
                <div className={`w-8 h-8 rounded-lg ${a.color} flex items-center justify-center text-sm shrink-0`}>
                  {a.icon}
                </div>
                <p className="text-sm text-text-secondary flex-1 truncate">{a.text}</p>
                <span className="text-2xs text-text-muted shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-4">
          <Link href="/conversations" className="card text-center hover:shadow-elevated transition-shadow duration-200 py-6">
            <svg className="w-6 h-6 text-accent-blue mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
            <p className="text-sm text-text-secondary">Conversations</p>
          </Link>
          <Link href="/callbacks" className="card text-center hover:shadow-elevated transition-shadow duration-200 py-6">
            <svg className="w-6 h-6 text-accent-green mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
            <p className="text-sm text-text-secondary">Callbacks</p>
          </Link>
          <Link href="/settings" className="card text-center hover:shadow-elevated transition-shadow duration-200 py-6">
            <svg className="w-6 h-6 text-accent-purple mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="text-sm text-text-secondary">Settings</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
