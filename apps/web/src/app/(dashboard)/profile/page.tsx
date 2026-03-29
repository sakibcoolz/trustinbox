'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { useProfile } from '@/hooks/useProfile';
import { useCareer, type WorkExperience, type Education, type Skill } from '@/hooks/useCareer';
import Link from 'next/link';

type Tab = 'overview' | 'activity' | 'privacy' | 'security' | 'career';

const COVER_GRADIENTS = [
  'from-blue-600 via-indigo-600 to-purple-700',
  'from-cyan-500 via-blue-600 to-indigo-700',
  'from-violet-600 via-purple-600 to-pink-600',
  'from-emerald-500 via-teal-600 to-cyan-600',
  'from-orange-500 via-red-500 to-rose-600',
];

const SP_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-violet-600',
  'from-green-500 to-emerald-600',
  'from-orange-400 to-amber-500',
  'from-cyan-500 to-blue-500',
  'from-rose-500 to-pink-600',
];

function spAbbr(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return m <= 1 ? 'just now' : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? '1d ago' : `${d}d ago`;
}

function formatJoinDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function daysSince(iso: string): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function activityIcon(type: string, category: string): string {
  if (type === 'callback') return '📞';
  if (type === 'message') return '💬';
  switch (category) {
    case 'PERSONAL': return '💬';
    case 'SERVICE_PROVIDER': return '🏢';
    case 'ADVERTISEMENT': return '📢';
    case 'CALLBACK': return '📞';
    default: return '📥';
  }
}

function activityColor(type: string, category: string): string {
  if (type === 'callback') return 'bg-accent-orange/10 text-accent-orange';
  switch (category) {
    case 'PERSONAL': return 'bg-accent-blue/10 text-accent-blue';
    case 'SERVICE_PROVIDER': return 'bg-accent-purple/10 text-accent-purple';
    case 'ADVERTISEMENT': return 'bg-accent-cyan/10 text-accent-cyan';
    case 'CALLBACK': return 'bg-accent-orange/10 text-accent-orange';
    default: return 'bg-accent-green/10 text-accent-green';
  }
}

function privacyScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent Privacy Score';
  if (score >= 70) return 'Good Privacy Score';
  if (score >= 50) return 'Fair Privacy Score';
  return 'Privacy Needs Attention';
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { upload, remove: removeAvatar, uploading: avatarUploading, error: avatarError, reset: resetAvatarError } = useAvatarUpload();
  const { profile, stats, serviceProviders, activity, privacy, sessions, loading, updateProfile } = useProfile();
  const career = useCareer();

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // ─── Career form state ───────────────────────────────────────────────────
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [editingWork, setEditingWork] = useState<WorkExperience | null>(null);
  const [workForm, setWorkForm] = useState({ jobTitle: '', company: '', industry: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' });

  const [showEduForm, setShowEduForm] = useState(false);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [eduForm, setEduForm] = useState({ school: '', degree: '', field: '', startYear: '', endYear: '', isCurrent: false, description: '' });

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillForm, setSkillForm] = useState({ name: '', level: '', category: '' });

  function openAddWork() {
    setEditingWork(null);
    setWorkForm({ jobTitle: '', company: '', industry: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' });
    setShowWorkForm(true);
  }
  function openEditWork(w: WorkExperience) {
    setEditingWork(w);
    setWorkForm({ jobTitle: w.jobTitle, company: w.company, industry: w.industry, location: w.location, startDate: w.startDate, endDate: w.endDate, isCurrent: w.isCurrent, description: w.description });
    setShowWorkForm(true);
  }
  async function submitWork() {
    const ok = await career.saveWork({ ...workForm, id: editingWork?.id });
    if (ok) setShowWorkForm(false);
  }

  function openAddEdu() {
    setEditingEdu(null);
    setEduForm({ school: '', degree: '', field: '', startYear: '', endYear: '', isCurrent: false, description: '' });
    setShowEduForm(true);
  }
  function openEditEdu(e: Education) {
    setEditingEdu(e);
    setEduForm({ school: e.school, degree: e.degree, field: e.field, startYear: String(e.startYear), endYear: e.endYear ? String(e.endYear) : '', isCurrent: e.isCurrent, description: e.description });
    setShowEduForm(true);
  }
  async function submitEdu() {
    const ok = await career.saveEducation({ ...eduForm, id: editingEdu?.id, startYear: Number(eduForm.startYear), endYear: eduForm.endYear ? Number(eduForm.endYear) : undefined });
    if (ok) setShowEduForm(false);
  }

  async function submitSkill() {
    const ok = await career.addSkill(skillForm);
    if (ok) { setShowSkillForm(false); setSkillForm({ name: '', level: '', category: '' }); }
  }
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [coverIdx, setCoverIdx] = useState(0);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (profile) {
      setCoverIdx(profile.coverIdx ?? 0);
      setFullName(profile.fullName || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setWebsite(profile.website || '');
    }
  }, [profile]);

  const [copied, setCopied] = useState(false);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const displayAvatarUrl = user?.avatarUrl ?? null;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await upload(file);
  }

  async function handleAvatarRemove() {
    await removeAvatar();
  }

  const handleCoverChange = useCallback(
    async (idx: number) => {
      setCoverIdx(idx);
      await updateProfile({ coverIdx: idx });
    },
    [updateProfile],
  );

  async function handleSave() {
    setIsSaving(true);
    const ok = await updateProfile({ fullName, bio, location, website });
    setIsSaving(false);
    if (ok) setIsEditing(false);
  }

  function handleCancel() {
    if (profile) {
      setFullName(profile.fullName || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setWebsite(profile.website || '');
      setCoverIdx(profile.coverIdx ?? 0);
    }
    setIsEditing(false);
  }

  const email = user?.email || '';
  const initials = (profile?.fullName || user?.fullName || '')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  function copyUsername() {
    navigator.clipboard.writeText(user?.username || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const privacyPolicies = privacy
    ? [
        { label: 'Personal messages', status: privacy.allowPersonalNotifications ? 'Allow All' : 'Blocked', color: privacy.allowPersonalNotifications ? 'chip-green' : 'chip-red' },
        { label: 'Service Provider messages', status: privacy.allowSPNotifications ? 'Allow Verified' : 'Blocked', color: privacy.allowSPNotifications ? 'chip-blue' : 'chip-red' },
        { label: 'Advertisements', status: privacy.allowAdvertisements ? 'Allowed' : 'Opt-In Only', color: privacy.allowAdvertisements ? 'chip-orange' : 'chip-green' },
        { label: 'Phone calls', status: privacy.requireCallApproval ? 'Requires Approval' : 'Allow All', color: privacy.requireCallApproval ? 'chip-purple' : 'chip-orange' },
      ]
    : [];

  const score = stats?.privacyScore ?? 0;
  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference - (score / 100) * circumference;
  const scoreColor = score >= 90 ? 'text-accent-green' : score >= 70 ? 'text-accent-cyan' : score >= 50 ? 'text-accent-orange' : 'text-accent-red';
  const ringColor = score >= 90 ? 'text-accent-green' : score >= 70 ? 'text-accent-cyan' : score >= 50 ? 'text-accent-orange' : 'text-accent-red';

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'activity', label: 'Activity' },
    { key: 'career', label: 'Career' },
    { key: 'privacy', label: 'Privacy & ID' },
    { key: 'security', label: 'Security' },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">

      {/* COVER BANNER */}
      <div className={`relative h-52 sm:h-64 w-full bg-gradient-to-r ${COVER_GRADIENTS[coverIdx]} shrink-0 overflow-hidden`}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.2),transparent_70%)]" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-96 h-96 rounded-full bg-black/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
          <span className="text-white/50 text-[10px] font-medium mr-1 hidden sm:inline">Cover</span>
          {COVER_GRADIENTS.map((g, i) => (
            <button key={i} onClick={() => handleCoverChange(i)} className={`w-4 h-4 rounded-full bg-gradient-to-br ${g} transition-all duration-200 ${coverIdx === i ? 'ring-2 ring-white ring-offset-1 ring-offset-black/40 scale-125' : 'opacity-60 hover:opacity-100'}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-0 flex-1 overflow-visible">

        {/* LEFT SIDEBAR */}
        <aside className="w-full lg:w-80 xl:w-88 shrink-0 px-4 lg:px-5 pb-6 lg:pb-0 lg:border-r lg:border-border-primary overflow-visible">

          {/* Avatar */}
          <div className="-mt-16 mb-4">
            <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
            <div className="relative inline-block group">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-accent-blue via-indigo-500 to-accent-purple flex items-center justify-center text-white text-4xl font-bold shadow-2xl ring-4 ring-bg-primary">
                {displayAvatarUrl ? (
                  <Image src={displayAvatarUrl} alt="Profile picture" width={112} height={112} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center z-20">
                  <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                </div>
              )}
              <span className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-status-online border-2 border-bg-primary rounded-full z-10" />
              {!avatarUploading && (
                <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/55 transition-colors duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer" title="Upload profile picture">
                  <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <span className="text-[10px] text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow">Change photo</span>
                </button>
              )}
            </div>
            {avatarError && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-accent-red">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" /></svg>
                <span>{avatarError}</span>
                <button onClick={resetAvatarError} className="ml-1 underline">Dismiss</button>
              </div>
            )}
            {displayAvatarUrl && !avatarUploading && (
              <button onClick={handleAvatarRemove} className="block mt-1.5 text-[11px] text-accent-red hover:underline">Remove photo</button>
            )}
          </div>

          {/* Name + badges */}
          <div className="mb-3">
            {isEditing ? (
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field h-9 text-lg font-bold w-full mb-2" />
            ) : loading ? (
              <div className="h-6 w-32 bg-bg-elevated animate-pulse rounded mb-1" />
            ) : (
              <h2 className="text-xl font-bold text-text-primary leading-tight">{profile?.fullName || user?.fullName || 'User'}</h2>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <button onClick={copyUsername} className="flex items-center gap-1 text-sm text-accent-blue font-medium hover:underline" title="Copy username">
                @{user?.username || 'user'}
                {copied
                  ? <svg className="w-3.5 h-3.5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  : <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
                }
              </button>
              <span className="chip-blue text-[10px]">Verified</span>
              <span className="chip-green text-[10px]">Privacy Pro</span>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-4">
            {isEditing ? (
              <textarea ref={bioRef} value={bio} onChange={(e) => setBio(e.target.value.slice(0, 200))} rows={3} className="input-field w-full text-sm resize-none" placeholder="Write a short bio..." />
            ) : loading ? (
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-bg-elevated animate-pulse rounded" />
                <div className="h-3 w-4/5 bg-bg-elevated animate-pulse rounded" />
              </div>
            ) : (
              <p className="text-sm text-text-secondary leading-relaxed">{bio || <span className="text-text-muted italic">No bio yet</span>}</p>
            )}
          </div>

          {/* Meta */}
          <div className="space-y-2 mb-5 text-sm">
            <div className="flex items-center gap-2 text-text-muted">
              <svg className="w-4 h-4 shrink-0 text-text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
              <span className="truncate">{email}</span>
            </div>
            {(location || isEditing) && (
              <div className="flex items-center gap-2 text-text-muted">
                <svg className="w-4 h-4 shrink-0 text-text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {isEditing
                  ? <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className="input-field h-7 text-sm flex-1 min-w-0" />
                  : <span>{location}</span>
                }
              </div>
            )}
            {profile?.joinedAt && (
              <div className="flex items-center gap-2 text-text-muted">
                <svg className="w-4 h-4 shrink-0 text-text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                <span>Joined {formatJoinDate(profile.joinedAt)}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-6">
            {isEditing ? (
              <>
                <button onClick={handleCancel} disabled={isSaving} className="btn-ghost flex-1 text-sm">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
                  {isSaving ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                  ) : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                  Edit Profile
                </button>
                <Link href="/settings" className="btn-secondary px-3 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </Link>
              </>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {[
              { value: loading ? '—' : String(stats?.spCount ?? 0), label: 'Connected SPs', color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
              { value: loading ? '—' : String(stats?.messagesCount ?? 0), label: 'Messages', color: 'text-accent-green', bg: 'bg-accent-green/10' },
              { value: loading ? '—' : String(stats?.policiesCount ?? 0), label: 'Policies', color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
              { value: loading ? '—' : `${stats?.privacyScore ?? 0}%`, label: 'Privacy Score', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
            ].map(({ value, label, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold ${color} leading-none`}>{value}</p>
                <p className="text-[10px] text-text-muted mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Connected orgs sidebar list */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Service Providers</p>
              <Link href="/service-providers" className="text-[11px] text-accent-blue hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="space-y-1.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-bg-elevated animate-pulse shrink-0" />
                    <div className="h-3 w-24 bg-bg-elevated animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : serviceProviders.length === 0 ? (
              <p className="text-xs text-text-muted px-2">No service providers yet.</p>
            ) : (
              <div className="space-y-1.5">
                {serviceProviders.map(({ id, name }, idx) => (
                  <div key={id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-tertiary transition-colors cursor-pointer">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${SP_COLORS[idx % SP_COLORS.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {spAbbr(name)}
                    </div>
                    <span className="text-sm text-text-secondary">{name}</span>
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-status-online" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Sticky tab bar */}
          <div className="flex border-b border-border-primary bg-bg-primary sticky top-0 z-10 shrink-0">
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`tab flex-1 sm:flex-none ${activeTab === key ? 'tab-active' : ''}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 space-y-5">

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">About</p>
                    {isEditing && <span className="text-[11px] text-text-muted">{bio.length}/200</span>}
                  </div>
                  {isEditing ? (
                    <textarea ref={bioRef} value={bio} onChange={(e) => setBio(e.target.value.slice(0, 200))} rows={3} className="input-field w-full text-sm resize-none" placeholder="Write a short bio..." />
                  ) : loading ? (
                    <div className="space-y-2">
                      <div className="h-3 w-full bg-bg-elevated animate-pulse rounded" />
                      <div className="h-3 w-3/4 bg-bg-elevated animate-pulse rounded" />
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary leading-relaxed">{bio || <span className="italic text-text-muted">No bio yet — click Edit Profile to add one.</span>}</p>
                  )}
                </div>

                <div className="card divide-y divide-border-primary space-y-0">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-3">Personal Information</p>
                  <div className="grid sm:grid-cols-2 gap-0 sm:divide-x sm:divide-border-primary">
                    <div className="space-y-0 divide-y divide-border-primary sm:pr-6">
                      <div className="flex items-center gap-3 py-3.5">
                        <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-text-muted">Full Name</p>
                          {isEditing
                            ? <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field h-8 text-sm mt-0.5 w-full" />
                            : <p className="text-sm font-medium text-text-primary">{profile?.fullName || user?.fullName || '—'}</p>
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-3 py-3.5">
                        <div className="w-9 h-9 rounded-lg bg-accent-purple/10 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-text-muted">Email</p>
                          <p className="text-sm font-medium text-text-primary truncate">{email}</p>
                        </div>
                        <span className="chip-green text-[10px] shrink-0">Verified</span>
                      </div>
                    </div>
                    <div className="space-y-0 divide-y divide-border-primary sm:pl-6">
                      <div className="flex items-center gap-3 py-3.5">
                        <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-text-muted">Username</p>
                          <p className="text-sm font-medium text-accent-blue">@{user?.username || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 py-3.5">
                        <div className="w-9 h-9 rounded-lg bg-accent-orange/10 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4 text-accent-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-text-muted">Location</p>
                          {isEditing
                            ? <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className="input-field h-8 text-sm mt-0.5 w-full" />
                            : <p className="text-sm font-medium text-text-primary">{location || '—'}</p>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Orgs grid */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Connected Service Providers</p>
                    <Link href="/service-providers" className="text-xs text-accent-blue hover:underline">View all</Link>
                  </div>
                  {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 p-3 bg-bg-tertiary rounded-xl">
                          <div className="w-10 h-10 rounded-xl bg-bg-elevated animate-pulse" />
                          <div className="h-2.5 w-16 bg-bg-elevated animate-pulse rounded" />
                        </div>
                      ))}
                    </div>
                  ) : serviceProviders.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-6">No service providers connected yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                      {serviceProviders.map(({ id, name }, idx) => (
                        <div key={id} className="flex flex-col items-center gap-2 p-3 bg-bg-tertiary rounded-xl hover:bg-bg-elevated transition-colors cursor-pointer group">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${SP_COLORS[idx % SP_COLORS.length]} flex items-center justify-center text-white text-sm font-bold shadow-md group-hover:scale-105 transition-transform`}>
                            {spAbbr(name)}
                          </div>
                          <span className="text-xs text-text-secondary text-center leading-tight">{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ACTIVITY */}
            {activeTab === 'activity' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Recent Activity</p>
                  <span className="text-xs text-text-muted">Latest events</span>
                </div>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="card flex items-start gap-4 p-4">
                      <div className="w-10 h-10 rounded-xl bg-bg-elevated animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 bg-bg-elevated animate-pulse rounded" />
                        <div className="h-2.5 w-1/2 bg-bg-elevated animate-pulse rounded" />
                      </div>
                    </div>
                  ))
                ) : activity.length === 0 ? (
                  <div className="card text-center py-12">
                    <p className="text-text-muted text-sm">No recent activity yet.</p>
                    <p className="text-text-muted/60 text-xs mt-1">Messages, notifications, and callback requests will appear here.</p>
                  </div>
                ) : (
                  activity.map((item) => (
                    <div key={item.id} className="card hover:border-border-hover transition-colors flex items-start gap-4 p-4 cursor-pointer">
                      <div className={`w-10 h-10 rounded-xl ${activityColor(item.type, item.category)} flex items-center justify-center text-xl shrink-0`}>
                        {activityIcon(item.type, item.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{item.title}</p>
                        {item.description && <p className="text-xs text-text-muted mt-0.5 truncate">{item.description}</p>}
                      </div>
                      <span className="text-[11px] text-text-muted shrink-0 pt-0.5">{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PRIVACY & ID */}
            {activeTab === 'privacy' && (
              <>
                <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-accent-green/20 via-teal-900/20 to-accent-cyan/10 border border-accent-green/20">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(16,185,129,0.08),transparent_60%)]" />
                  <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="relative w-20 h-20 shrink-0">
                      {loading ? (
                        <div className="w-20 h-20 rounded-full bg-bg-elevated animate-pulse" />
                      ) : (
                        <>
                          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                            <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="5" className="text-bg-tertiary" />
                            <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" className={ringColor} />
                          </svg>
                          <span className={`absolute inset-0 flex items-center justify-center text-base font-bold ${scoreColor}`}>{score}%</span>
                        </>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-text-primary">{privacyScoreLabel(score)}</p>
                      <p className="text-sm text-text-muted mt-1">Your identity is well-protected across all connected service providers. Your real phone number and personal details are never exposed.</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="chip-green text-xs">Identity Protected</span>
                        <span className="chip-cyan text-xs">Phone Hidden</span>
                        <span className="chip-blue text-xs">Email Verified</span>
                        {sessions?.hasTwoFactor && <span className="chip-purple text-xs">2FA Enabled</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="card divide-y divide-border-primary space-y-0">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-3">Identity</p>
                    <div className="flex items-start gap-3 py-3.5">
                      <div className="w-9 h-9 rounded-lg bg-accent-green/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between"><p className="text-[11px] text-text-muted">Virtual Public ID</p><span className="chip-green text-[10px]">Protected</span></div>
                        <p className="text-xs font-mono font-medium text-text-primary mt-1 break-all">{profile?.virtualPublicId || user?.virtualPublicId || 'TRUST-XXXX-XXXX'}</p>
                      <p className="text-[11px] text-text-muted mt-1">Shown to service providers instead of your real identity.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 py-3.5">
                      <div className="w-9 h-9 rounded-lg bg-accent-red/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between"><p className="text-[11px] text-text-muted">Phone Number</p><span className="chip-red text-[10px]">Hidden</span></div>
                        <p className="text-sm font-medium text-text-primary mt-1">••••••••••</p>
                        <p className="text-[11px] text-text-muted mt-1">Never shared with any service provider.</p>
                      </div>
                    </div>
                  </div>

                  <div className="card divide-y divide-border-primary space-y-0">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pb-3">Communication Policies</p>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <div className="h-3 w-32 bg-bg-elevated animate-pulse rounded" />
                          <div className="h-4 w-20 bg-bg-elevated animate-pulse rounded-full" />
                        </div>
                      ))
                    ) : (
                      privacyPolicies.map((p) => (
                        <div key={p.label} className="flex items-center justify-between py-3">
                          <p className="text-sm text-text-primary">{p.label}</p>
                          <span className={`${p.color} text-[10px]`}>{p.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link href="/settings" className="btn-primary flex-1 text-center text-sm">Manage Policies</Link>
                  <Link href="/settings" className="btn-secondary flex-1 text-center text-sm">Privacy Settings</Link>
                </div>
              </>
            )}

            {/* SECURITY */}
            {activeTab === 'security' && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="card flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">Password</p>
                        <span className="chip-green text-[10px]">Strong</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{sessions ? `Last changed ${daysSince(sessions.passwordUpdatedAt)}` : 'Loading…'}</p>
                    </div>
                    <button className="btn-ghost text-xs shrink-0">Change</button>
                  </div>

                  <div className="card flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3.75h3m-3 3.75h3" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">Two-Factor Auth</p>
                        {sessions?.hasTwoFactor
                          ? <span className="chip-blue text-[10px]">Enabled</span>
                          : <span className="chip-orange text-[10px]">Disabled</span>
                        }
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{sessions?.hasTwoFactor ? 'Authenticator app enabled' : 'Not yet configured'}</p>
                    </div>
                    <button className="btn-ghost text-xs shrink-0">Manage</button>
                  </div>

                  <div className="card flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">Active Sessions</p>
                        <span className="chip-purple text-[10px]">{sessions ? `${sessions.activeSessions} active` : '—'}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{sessions ? `${sessions.activeSessions} device${sessions.activeSessions !== 1 ? 's' : ''} currently logged in` : 'Loading…'}</p>
                    </div>
                    <button className="btn-ghost text-xs shrink-0">View</button>
                  </div>

                  <div className="card flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-accent-orange/10 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-accent-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">Login Activity</p>
                        <span className="chip-orange text-[10px]">Reviewed</span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">{sessions?.lastLoginAt ? `Last login: ${formatDateTime(sessions.lastLoginAt)}` : 'No login recorded'}</p>
                    </div>
                    <button className="btn-ghost text-xs shrink-0">History</button>
                  </div>
                </div>

                <div className="card border-accent-red/20 bg-accent-red/5">
                  <p className="text-xs font-semibold text-accent-red uppercase tracking-wider mb-3">Danger Zone</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button className="btn-secondary flex-1 text-sm">Deactivate Account</button>
                    <button className="btn-danger flex-1 text-sm">Delete Account Permanently</button>
                  </div>
                </div>
              </>
            )}

            {/* ─── CAREER ─────────────────────────────────────────────────────── */}
            {activeTab === 'career' && (
              <>
                {/* ── Work Experience ── */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Work Experience</p>
                    <button onClick={openAddWork} className="btn-ghost text-xs flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Add
                    </button>
                  </div>

                  {/* Inline add/edit form */}
                  {showWorkForm && (
                    <div className="mb-4 p-4 rounded-xl bg-bg-elevated border border-border-primary space-y-3">
                      <p className="text-xs font-semibold text-text-secondary">{editingWork ? 'Edit Position' : 'New Position'}</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Job Title *</label>
                          <input value={workForm.jobTitle} onChange={(e) => setWorkForm((f) => ({ ...f, jobTitle: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="e.g. Senior Engineer" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Company *</label>
                          <input value={workForm.company} onChange={(e) => setWorkForm((f) => ({ ...f, company: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="e.g. Acme Corp" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Industry</label>
                          <input value={workForm.industry} onChange={(e) => setWorkForm((f) => ({ ...f, industry: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="e.g. Technology" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Location</label>
                          <input value={workForm.location} onChange={(e) => setWorkForm((f) => ({ ...f, location: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="e.g. New York, US" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Start Date * (YYYY-MM)</label>
                          <input value={workForm.startDate} onChange={(e) => setWorkForm((f) => ({ ...f, startDate: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="2022-03" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">End Date (YYYY-MM)</label>
                          <input value={workForm.endDate} disabled={workForm.isCurrent} onChange={(e) => setWorkForm((f) => ({ ...f, endDate: e.target.value }))} className="input-field h-8 text-sm w-full disabled:opacity-40" placeholder="2024-06" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
                        <input type="checkbox" checked={workForm.isCurrent} onChange={(e) => setWorkForm((f) => ({ ...f, isCurrent: e.target.checked, endDate: e.target.checked ? '' : f.endDate }))} className="rounded border-border-primary" />
                        Currently working here
                      </label>
                      <div>
                        <label className="block text-[11px] text-text-muted mb-1">Description</label>
                        <textarea value={workForm.description} onChange={(e) => setWorkForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="input-field w-full text-sm resize-none" placeholder="Key responsibilities or achievements..." />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowWorkForm(false)} className="btn-ghost text-xs flex-1">Cancel</button>
                        <button onClick={submitWork} disabled={career.saving} className="btn-primary text-xs flex-1">{career.saving ? 'Saving…' : 'Save'}</button>
                      </div>
                    </div>
                  )}

                  {career.loading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-bg-elevated animate-pulse shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3.5 w-40 bg-bg-elevated animate-pulse rounded" />
                            <div className="h-3 w-28 bg-bg-elevated animate-pulse rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : career.workExperience.length === 0 && !showWorkForm ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </div>
                      <p className="text-sm text-text-muted">No work experience added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-0 divide-y divide-border-primary">
                      {career.workExperience.map((w) => (
                        <div key={w.id} className="flex gap-4 py-4 first:pt-0 last:pb-0 group">
                          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-text-primary">{w.jobTitle}</p>
                                <p className="text-sm text-text-secondary">{w.company}{w.industry ? ` · ${w.industry}` : ''}</p>
                                <p className="text-xs text-text-muted mt-0.5">
                                  {w.startDate}{w.isCurrent ? ' — Present' : w.endDate ? ` — ${w.endDate}` : ''}
                                  {w.location ? ` · ${w.location}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => openEditWork(w)} className="btn-ghost text-xs p-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                                </button>
                                <button onClick={() => career.deleteWork(w.id)} className="btn-ghost text-xs p-1.5 text-accent-red hover:text-accent-red">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                </button>
                              </div>
                            </div>
                            {w.description && <p className="text-xs text-text-muted mt-1.5 leading-relaxed line-clamp-2">{w.description}</p>}
                            {w.isCurrent && <span className="chip-green text-[10px] mt-2 inline-block">Current</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Education ── */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Education</p>
                    <button onClick={openAddEdu} className="btn-ghost text-xs flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Add
                    </button>
                  </div>

                  {showEduForm && (
                    <div className="mb-4 p-4 rounded-xl bg-bg-elevated border border-border-primary space-y-3">
                      <p className="text-xs font-semibold text-text-secondary">{editingEdu ? 'Edit Education' : 'New Education'}</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">School / University *</label>
                          <input value={eduForm.school} onChange={(e) => setEduForm((f) => ({ ...f, school: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="e.g. MIT" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Degree</label>
                          <input value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="e.g. Bachelor of Science" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Field of Study</label>
                          <input value={eduForm.field} onChange={(e) => setEduForm((f) => ({ ...f, field: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="e.g. Computer Science" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] text-text-muted mb-1">Start Year *</label>
                            <input value={eduForm.startYear} onChange={(e) => setEduForm((f) => ({ ...f, startYear: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="2018" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-text-muted mb-1">End Year</label>
                            <input value={eduForm.endYear} disabled={eduForm.isCurrent} onChange={(e) => setEduForm((f) => ({ ...f, endYear: e.target.value }))} className="input-field h-8 text-sm w-full disabled:opacity-40" placeholder="2022" />
                          </div>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
                        <input type="checkbox" checked={eduForm.isCurrent} onChange={(e) => setEduForm((f) => ({ ...f, isCurrent: e.target.checked, endYear: e.target.checked ? '' : f.endYear }))} className="rounded border-border-primary" />
                        Currently enrolled
                      </label>
                      <div>
                        <label className="block text-[11px] text-text-muted mb-1">Description</label>
                        <textarea value={eduForm.description} onChange={(e) => setEduForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="input-field w-full text-sm resize-none" placeholder="Activities, awards, thesis..." />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowEduForm(false)} className="btn-ghost text-xs flex-1">Cancel</button>
                        <button onClick={submitEdu} disabled={career.saving} className="btn-primary text-xs flex-1">{career.saving ? 'Saving…' : 'Save'}</button>
                      </div>
                    </div>
                  )}

                  {career.loading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-bg-elevated animate-pulse shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3.5 w-40 bg-bg-elevated animate-pulse rounded" />
                            <div className="h-3 w-28 bg-bg-elevated animate-pulse rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : career.education.length === 0 && !showEduForm ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
                      </div>
                      <p className="text-sm text-text-muted">No education added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-0 divide-y divide-border-primary">
                      {career.education.map((e) => (
                        <div key={e.id} className="flex gap-4 py-4 first:pt-0 last:pb-0 group">
                          <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-text-primary">{e.school}</p>
                                <p className="text-sm text-text-secondary">{[e.degree, e.field].filter(Boolean).join(' · ') || 'No degree specified'}</p>
                                <p className="text-xs text-text-muted mt-0.5">
                                  {e.startYear}{e.isCurrent ? ' — Present' : e.endYear ? ` — ${e.endYear}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => openEditEdu(e)} className="btn-ghost text-xs p-1.5">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                                </button>
                                <button onClick={() => career.deleteEducation(e.id)} className="btn-ghost text-xs p-1.5 text-accent-red hover:text-accent-red">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                </button>
                              </div>
                            </div>
                            {e.description && <p className="text-xs text-text-muted mt-1.5 leading-relaxed line-clamp-2">{e.description}</p>}
                            {e.isCurrent && <span className="chip-green text-[10px] mt-2 inline-block">Enrolled</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Skills ── */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Skills</p>
                    <button onClick={() => setShowSkillForm((v) => !v)} className="btn-ghost text-xs flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Add Skill
                    </button>
                  </div>

                  {showSkillForm && (
                    <div className="mb-4 p-4 rounded-xl bg-bg-elevated border border-border-primary space-y-3">
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Skill Name *</label>
                          <input value={skillForm.name} onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="e.g. TypeScript" />
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Level</label>
                          <select value={skillForm.level} onChange={(e) => setSkillForm((f) => ({ ...f, level: e.target.value }))} className="input-field h-8 text-sm w-full">
                            <option value="">— Select —</option>
                            <option value="BEGINNER">Beginner</option>
                            <option value="INTERMEDIATE">Intermediate</option>
                            <option value="ADVANCED">Advanced</option>
                            <option value="EXPERT">Expert</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] text-text-muted mb-1">Category</label>
                          <input value={skillForm.category} onChange={(e) => setSkillForm((f) => ({ ...f, category: e.target.value }))} className="input-field h-8 text-sm w-full" placeholder="e.g. Technical" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowSkillForm(false)} className="btn-ghost text-xs flex-1">Cancel</button>
                        <button onClick={submitSkill} disabled={career.saving} className="btn-primary text-xs flex-1">{career.saving ? 'Saving…' : 'Add Skill'}</button>
                      </div>
                    </div>
                  )}

                  {career.skills.length === 0 && !showSkillForm ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg>
                      </div>
                      <p className="text-sm text-text-muted">No skills added yet.</p>
                    </div>
                  ) : (
                    (() => {
                      const grouped = career.skills.reduce<Record<string, Skill[]>>((acc, s) => {
                        const cat = s.category || 'Other';
                        (acc[cat] = acc[cat] || []).push(s);
                        return acc;
                      }, {});
                      const LEVEL_COLOR: Record<string, string> = {
                        EXPERT: 'chip-purple',
                        ADVANCED: 'chip-blue',
                        INTERMEDIATE: 'chip-cyan',
                        BEGINNER: 'chip-green',
                        '': 'chip-green',
                      };
                      return (
                        <div className="space-y-4">
                          {Object.entries(grouped).map(([cat, items]) => (
                            <div key={cat}>
                              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">{cat}</p>
                              <div className="flex flex-wrap gap-2">
                                {items.map((s) => (
                                  <div key={s.id} className="group flex items-center gap-1.5 bg-bg-elevated border border-border-primary rounded-lg px-2.5 py-1.5">
                                    <span className="text-sm text-text-primary">{s.name}</span>
                                    {s.level && <span className={`${LEVEL_COLOR[s.level]} text-[10px]`}>{s.level.charAt(0) + s.level.slice(1).toLowerCase()}</span>}
                                    <button onClick={() => career.deleteSkill(s.id)} className="ml-1 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>

                {career.error && (
                  <div className="card border-accent-red/20 bg-accent-red/5 text-sm text-accent-red">{career.error}</div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
