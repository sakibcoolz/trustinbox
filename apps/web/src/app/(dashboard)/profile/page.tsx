'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email] = useState(user?.email || '');

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const memberSince = 'March 2026';

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center hover:bg-bg-hover transition-colors">
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Profile</h1>
            <p className="text-2xs text-text-muted">Your account information</p>
          </div>
        </div>

        {/* Avatar card */}
        <div className="card flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-2xl font-bold shadow-glow">
              {initials}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-status-online border-2 border-bg-secondary rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-text-primary">{user?.fullName || 'User'}</h2>
            <p className="text-sm text-accent-blue font-medium">{user?.username || 'c/user'}</p>
            <p className="text-2xs text-text-muted mt-1">Member since {memberSince}</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={isEditing ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
          >
            {isEditing ? 'Save' : 'Edit'}
          </button>
        </div>

        {/* Info cards */}
        <div className="space-y-4">
          {/* Personal info */}
          <div className="card space-y-0 divide-y divide-border-primary">
            <div className="pb-3">
              <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Personal Information</p>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                </div>
                <div>
                  <p className="text-2xs text-text-muted">Full Name</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-field h-8 text-sm mt-0.5 w-56"
                    />
                  ) : (
                    <p className="text-sm font-medium text-text-primary">{user?.fullName || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                </div>
                <div>
                  <p className="text-2xs text-text-muted">Email</p>
                  <p className="text-sm font-medium text-text-primary">{email}</p>
                </div>
              </div>
              <span className="chip-green text-2xs">Verified</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 6.166a3.375 3.375 0 016.75 0H7.125z" /></svg>
                </div>
                <div>
                  <p className="text-2xs text-text-muted">Username</p>
                  <p className="text-sm font-medium text-accent-blue">{user?.username || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Identity */}
          <div className="card space-y-0 divide-y divide-border-primary">
            <div className="pb-3">
              <p className="text-2xs text-text-muted uppercase tracking-wider font-medium">Privacy & Identity</p>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-green/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                </div>
                <div>
                  <p className="text-2xs text-text-muted">Virtual Public ID</p>
                  <p className="text-sm font-mono font-medium text-text-primary">{user?.virtualPublicId || '—'}</p>
                  <p className="text-2xs text-text-muted mt-0.5">This is what organizations see instead of your real identity</p>
                </div>
              </div>
              <span className="chip-green text-2xs">Protected</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-red/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                </div>
                <div>
                  <p className="text-2xs text-text-muted">Phone Number</p>
                  <p className="text-sm font-medium text-text-primary">••••••••••</p>
                  <p className="text-2xs text-text-muted mt-0.5">Never shared with organizations</p>
                </div>
              </div>
              <span className="chip-red text-2xs">Hidden</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-accent-blue">6</p>
              <p className="text-2xs text-text-muted mt-1">Connected Orgs</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-accent-green">24</p>
              <p className="text-2xs text-text-muted mt-1">Messages</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-accent-purple">3</p>
              <p className="text-2xs text-text-muted mt-1">Active Policies</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex gap-3">
            <Link href="/settings/privacy" className="btn-secondary flex-1 text-center text-sm">Privacy Settings</Link>
            <Link href="/settings" className="btn-ghost flex-1 text-center text-sm">All Settings</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
