'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

type Tab = 'overview' | 'activity' | 'privacy' | 'security';

const COVER_GRADIENTS = [
  'from-blue-600 via-indigo-600 to-purple-700',
  'from-cyan-500 via-blue-600 to-indigo-700',
  'from-violet-600 via-purple-600 to-pink-600',
  'from-emerald-500 via-teal-600 to-cyan-600',
  'from-orange-500 via-red-500 to-rose-600',
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [coverIdx, setCoverIdx] = useState(0);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState('Privacy advocate & tech enthusiast. Keeping my communications secure.');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [copied, setCopied] = useState(false);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  const email = user?.email || '';

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const memberSince = 'March 2026';

  function copyUsername() {
    navigator.clipboard.writeText(user?.username || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'activity', label: 'Activity' },
    { key: 'privacy', label: 'Privacy & ID' },
    { key: 'security', label: 'Security' },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      {/* ── COVER BANNER ── */}
      <div className={`relative h-44 bg-gradient-to-r ${COVER_GRADIENTS[coverIdx]} overflow-hidden`}>
        {/* decorative blobs */}
        <div className="absolute -top-10 -left-10 w-60 h-60 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-16 right-10 w-72 h-72 rounded-full bg-white/5 blur-3xl" />

        {/* top-left back button */}
        <Link
          href="/conversations"
          className="absolute top-3 left-4 flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium transition-colors backdrop-blur-sm bg-black/20 px-2.5 py-1.5 rounded-lg"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>

        {/* top-right: change cover */}
        <div className="absolute top-3 right-4 flex items-center gap-2">
          {COVER_GRADIENTS.map((g, i) => (
            <button
              key={i}
              onClick={() => setCoverIdx(i)}
              className={`w-5 h-5 rounded-full bg-gradient-to-br ${g} border-2 transition-all ${coverIdx === i ? 'border-white scale-125' : 'border-white/30 hover:border-white/70'}`}
            />
          ))}
        </div>
      </div>

      {/* ── AVATAR + IDENTITY ROW ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 pb-5 border-b border-border-primary">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-3xl font-bold shadow-xl ring-4 ring-bg-primary">
              {initials}
            </div>
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-status-online border-2 border-bg-primary rounded-full" />
            {isEditing && (
              <button className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </button>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 mt-2 sm:mt-0 sm:mb-1">
            <div className="flex flex-wrap items-center gap-2">
              {isEditing ? (
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field h-9 text-xl font-bold w-64"
                />
              ) : (
                <h1 className="text-xl font-bold text-text-primary leading-tight">{user?.fullName || 'User'}</h1>
              )}
              <span className="chip-blue text-xs">Verified</span>
              <span className="chip-green text-xs">Privacy Pro</span>
            </div>

            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm text-accent-blue font-medium">@{user?.username || 'user'}</span>
              <button
                onClick={copyUsername}
                className="w-5 h-5 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary flex items-center justify-center transition-colors"
                title="Copy username"
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                  </svg>
                )}
              </button>
            </div>

            {/* Meta chips row */}
            <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Joined {memberSince}
              </span>
              {location && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {location}
                </span>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-accent-blue hover:underline">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  {website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 sm:mb-1">
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm">Cancel</button>
                <button onClick={() => setIsEditing(false)} className="btn-primary text-sm flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Save
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                  Edit Profile
                </button>
                <Link href="/settings" className="btn-ghost text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── STATS BAR ── */}
        <div className="grid grid-cols-4 divide-x divide-border-primary border-b border-border-primary">
          {[
            { value: '6', label: 'Orgs', color: 'text-accent-blue' },
            { value: '24', label: 'Messages', color: 'text-accent-green' },
            { value: '3', label: 'Policies', color: 'text-accent-purple' },
            { value: '98%', label: 'Privacy Score', color: 'text-accent-cyan' },
          ].map(({ value, label, color }) => (
            <div key={label} className="py-4 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-2xs text-text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div className="flex border-b border-border-primary mt-0">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`tab ${activeTab === key ? 'tab-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="py-5 space-y-4 pb-16">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              {/* Bio */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">About</p>
                  {isEditing && <span className="text-2xs text-text-muted">{bio.length}/160</span>}
                </div>
                {isEditing ? (
                  <textarea
                    ref={bioRef}
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 160))}
                    rows={3}
                    className="input-field w-full text-sm resize-none"
                    placeholder="Write a short bio..."
                  />
                ) : (
                  <p className="text-sm text-text-secondary leading-relaxed">{bio || <span className="text-text-muted italic">No bio yet.</span>}</p>
                )}
              </div>

              {/* Personal info */}
              <div className="card divide-y divide-border-primary space-y-0">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-3">Personal Information</p>

                {/* Full Name */}
                <div className="flex items-center gap-3 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs text-text-muted">Full Name</p>
                    {isEditing ? (
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field h-8 text-sm mt-0.5 w-full max-w-xs" />
                    ) : (
                      <p className="text-sm font-medium text-text-primary">{user?.fullName || '—'}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-accent-purple/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs text-text-muted">Email</p>
                    <p className="text-sm font-medium text-text-primary">{email}</p>
                  </div>
                  <span className="chip-green text-2xs shrink-0">Verified</span>
                </div>

                {/* Username */}
                <div className="flex items-center gap-3 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs text-text-muted">Username</p>
                    <p className="text-sm font-medium text-accent-blue">@{user?.username || '—'}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-3 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-accent-orange/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-accent-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs text-text-muted">Location</p>
                    {isEditing ? (
                      <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className="input-field h-8 text-sm mt-0.5 w-full max-w-xs" />
                    ) : (
                      <p className="text-sm font-medium text-text-primary">{location || <span className="text-text-muted">—</span>}</p>
                    )}
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center gap-3 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-accent-green/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xs text-text-muted">Website</p>
                    {isEditing ? (
                      <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" className="input-field h-8 text-sm mt-0.5 w-full max-w-xs" />
                    ) : (
                      <p className="text-sm font-medium text-text-primary">{website || <span className="text-text-muted">—</span>}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Connected orgs mini-grid */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Connected Organizations</p>
                  <Link href="/organizations" className="text-xs text-accent-blue hover:underline">View all</Link>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['Acme Corp', 'TechHub', 'HealthPlus', 'EduNet', 'FinServ', 'RetailX'].map((name) => (
                    <div key={name} className="flex items-center gap-2 bg-bg-tertiary rounded-lg px-2.5 py-2">
                      <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent-blue/30 to-accent-purple/30 flex items-center justify-center text-2xs font-bold text-accent-blue shrink-0">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs text-text-secondary truncate">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── ACTIVITY ── */}
          {activeTab === 'activity' && (
            <div className="card divide-y divide-border-primary space-y-0">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-3">Recent Activity</p>
              {[
                { icon: '💬', label: 'Sent a message to Acme Corp', time: '2h ago', color: 'bg-accent-blue/10 text-accent-blue' },
                { icon: '📎', label: 'Shared a file in HealthPlus chat', time: '5h ago', color: 'bg-accent-purple/10 text-accent-purple' },
                { icon: '🔔', label: 'Received a callback request from TechHub', time: '1d ago', color: 'bg-accent-orange/10 text-accent-orange' },
                { icon: '✅', label: 'Accepted a connection from EduNet', time: '2d ago', color: 'bg-accent-green/10 text-accent-green' },
                { icon: '🛡️', label: 'Updated privacy policy for Advertisements', time: '3d ago', color: 'bg-accent-cyan/10 text-accent-cyan' },
                { icon: '📥', label: 'New inbox notification from FinServ', time: '4d ago', color: 'bg-accent-red/10 text-accent-red' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-3.5">
                  <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center text-base shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{item.label}</p>
                    <p className="text-2xs text-text-muted mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── PRIVACY & ID ── */}
          {activeTab === 'privacy' && (
            <>
              {/* Privacy score card */}
              <div className="card bg-gradient-to-r from-accent-green/10 to-accent-cyan/5 border-accent-green/20">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-bg-tertiary" />
                      <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="150.8" strokeDashoffset="3" strokeLinecap="round" className="text-accent-green" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-accent-green">98%</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Excellent Privacy Score</p>
                    <p className="text-xs text-text-muted mt-0.5">Your identity is well-protected across all connected organizations.</p>
                    <div className="flex gap-1.5 mt-2">
                      <span className="chip-green text-2xs">Identity Protected</span>
                      <span className="chip-cyan text-2xs">Phone Hidden</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card divide-y divide-border-primary space-y-0">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-3">Identity</p>

                <div className="flex items-start gap-3 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-accent-green/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-text-muted">Virtual Public ID</p>
                      <span className="chip-green text-2xs">Protected</span>
                    </div>
                    <p className="text-sm font-mono font-medium text-text-primary mt-0.5 break-all">{user?.virtualPublicId || '—'}</p>
                    <p className="text-2xs text-text-muted mt-1">Organizations see this instead of your real identity.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-3.5">
                  <div className="w-9 h-9 rounded-lg bg-accent-red/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-2xs text-text-muted">Phone Number</p>
                      <span className="chip-red text-2xs">Hidden</span>
                    </div>
                    <p className="text-sm font-medium text-text-primary mt-0.5">••••••••••</p>
                    <p className="text-2xs text-text-muted mt-1">Never shared with any organization.</p>
                  </div>
                </div>
              </div>

              <div className="card divide-y divide-border-primary space-y-0">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-3">Communication Policies</p>
                {[
                  { label: 'Personal messages', status: 'Allow All', color: 'chip-green' },
                  { label: 'Organizational messages', status: 'Allow Verified', color: 'chip-blue' },
                  { label: 'Advertisements', status: 'Opt-In Only', color: 'chip-orange' },
                  { label: 'Phone calls', status: 'Requires Approval', color: 'chip-purple' },
                ].map((p) => (
                  <div key={p.label} className="flex items-center justify-between py-3">
                    <p className="text-sm text-text-primary">{p.label}</p>
                    <span className={`${p.color} text-2xs`}>{p.status}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Link href="/settings" className="btn-primary flex-1 text-center text-sm">Manage Policies</Link>
                <Link href="/settings" className="btn-secondary flex-1 text-center text-sm">Privacy Settings</Link>
              </div>
            </>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <>
              <div className="card divide-y divide-border-primary space-y-0">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-3">Account Security</p>

                {[
                  {
                    icon: (
                      <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                    ),
                    bg: 'bg-accent-green/10',
                    label: 'Password',
                    sub: 'Last changed 30 days ago',
                    badge: <span className="chip-green text-2xs">Strong</span>,
                    action: 'Change',
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3.75h3m-3 3.75h3" />
                      </svg>
                    ),
                    bg: 'bg-accent-blue/10',
                    label: 'Two-Factor Authentication',
                    sub: 'Authenticator app',
                    badge: <span className="chip-blue text-2xs">Enabled</span>,
                    action: 'Manage',
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                      </svg>
                    ),
                    bg: 'bg-accent-purple/10',
                    label: 'Active Sessions',
                    sub: '2 devices logged in',
                    badge: <span className="chip-purple text-2xs">2 active</span>,
                    action: 'View',
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4 text-accent-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l-.001-1.286a.75.75 0 01.018-.189l.032-.133c.09-.394.177-.786.032-1.211L18 10.5" />
                      </svg>
                    ),
                    bg: 'bg-accent-orange/10',
                    label: 'Login Activity',
                    sub: 'Last login: Today at 9:14 AM',
                    badge: <span className="chip-orange text-2xs">Reviewed</span>,
                    action: 'History',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-3.5">
                    <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary">{item.label}</p>
                        {item.badge}
                      </div>
                      <p className="text-2xs text-text-muted mt-0.5">{item.sub}</p>
                    </div>
                    <button className="btn-ghost text-xs shrink-0">{item.action}</button>
                  </div>
                ))}
              </div>

              {/* Danger zone */}
              <div className="card border-accent-red/20 bg-accent-red/5">
                <p className="text-xs font-semibold text-accent-red uppercase tracking-wider mb-3">Danger Zone</p>
                <div className="space-y-2">
                  <button className="btn-secondary w-full text-sm text-left">Deactivate Account</button>
                  <button className="btn-danger w-full text-sm text-left">Delete Account Permanently</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
