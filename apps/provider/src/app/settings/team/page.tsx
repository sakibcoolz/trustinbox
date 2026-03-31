'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, UserPlus, Shield, Trash2, Mail, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { team, profile, type TeamMember, type Invitation, type ActivityItem, ApiError } from '@/lib/api';

const roleOptions = ['SP_ADMIN', 'AGENT', 'ANALYST'] as const;
type Role = (typeof roleOptions)[number];

const roleLabels: Record<string, string> = {
  SP_ADMIN: 'Admin',
  AGENT: 'Agent',
  ANALYST: 'Analyst',
};

const roleColors: Record<string, string> = {
  SP_ADMIN: 'bg-accent-purple/10 text-accent-purple',
  AGENT: 'bg-accent-blue/10 text-accent-blue',
  ANALYST: 'bg-border-secondary text-text-muted',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-status-success/10 text-status-success',
  PENDING: 'bg-status-warning/10 text-status-warning',
  EXPIRED: 'bg-status-error/10 text-status-error',
  REVOKED: 'bg-border-secondary text-text-muted',
};

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('AGENT');
  const [inviting, setInviting] = useState(false);

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, invRes, actRes] = await Promise.all([
        team.listMembers(),
        team.listInvitations('PENDING'),
        profile.activity(),
      ]);
      setMembers(membersRes.items || []);
      setInvitations(invRes.items || []);
      setActivity(actRes.activity || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setError('');
    try {
      await team.invite(inviteEmail, inviteRole);
      setInviteEmail('');
      setShowInvite(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setError('');
    try {
      await team.changeRole(userId, newRole);
      await fetchData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change role');
    }
  }

  async function handleRemove(userId: string) {
    setError('');
    try {
      await team.removeMember(userId);
      setConfirmRemove(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove member');
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    setError('');
    try {
      await team.revokeInvitation(invitationId);
      await fetchData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to revoke invitation');
    }
  }

  const totalMembers = members.length;
  const adminCount = members.filter((m) => m.role === 'SP_ADMIN').length;
  const agentCount = members.filter((m) => m.role === 'AGENT').length;
  const pendingCount = invitations.length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Team Management</h1>
            <p className="text-text-secondary text-sm mt-0.5">Manage agents and team members</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} disabled={loading}
            className="p-2.5 border border-border-secondary rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={`text-text-muted ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
            <UserPlus size={16} /> Invite Member
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between px-4 py-2 bg-status-error/10 border border-status-error/20 rounded-lg text-sm text-status-error">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      {/* Invite Form */}
      {showInvite && (
        <form onSubmit={handleInvite} className="bg-bg-card border border-accent-blue/30 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Invite Team Member</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required
                  className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="colleague@acme.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                {roleOptions.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowInvite(false)} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary">Cancel</button>
            <button type="submit" disabled={inviting}
              className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
              {inviting ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: totalMembers },
          { label: 'Admins', value: adminCount },
          { label: 'Agents', value: agentCount },
          { label: 'Pending Invites', value: pendingCount },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-lg font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Members Table */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-primary">
          <h3 className="text-sm font-semibold">Active Members</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-text-muted text-sm">Loading team members…</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No team members yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-xs text-text-muted">
                <th className="px-4 py-3 text-left font-medium">Member</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-medium text-text-secondary">
                        {m.userId.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-text-primary">{m.userId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                      className="px-2 py-0.5 bg-transparent border border-border-secondary rounded text-xs font-medium focus:outline-none focus:border-border-active">
                      {roleOptions.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[m.status] || ''}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {confirmRemove === m.userId ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-status-error">Confirm?</span>
                        <button onClick={() => handleRemove(m.userId)}
                          className="px-2 py-1 bg-status-error/10 text-status-error rounded text-xs font-medium hover:bg-status-error/20">
                          Remove
                        </button>
                        <button onClick={() => setConfirmRemove(null)}
                          className="px-2 py-1 text-text-muted rounded text-xs hover:bg-bg-hover">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button title="Change role" className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted">
                          <Shield size={14} />
                        </button>
                        <button title="Remove member" onClick={() => setConfirmRemove(m.userId)}
                          className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-primary">
            <h3 className="text-sm font-semibold">Pending Invitations</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary text-xs text-text-muted">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Expires</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 text-text-primary">{inv.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[inv.role] || ''}`}>
                      {roleLabels[inv.role] || inv.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] || ''}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleRevokeInvitation(inv.id)}
                      className="px-2 py-1 text-xs text-status-error hover:bg-status-error/10 rounded transition-colors">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Log */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-primary">
          <h3 className="text-sm font-semibold">Recent Activity</h3>
        </div>
        {activity.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No recent activity</div>
        ) : (
          <div className="divide-y divide-border-primary">
            {activity.slice(0, 10).map((item) => (
              <div key={item.id} className="px-4 py-3 flex items-center gap-3 hover:bg-bg-hover transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  item.type === 'notification' ? 'bg-accent-blue' :
                  item.type === 'callback' ? 'bg-accent-purple' : 'bg-text-muted'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{item.title}</p>
                  <p className="text-xs text-text-muted truncate">{item.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[item.status] || 'bg-border-secondary text-text-muted'}`}>
                    {item.status}
                  </span>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
