'use client';

import { useState } from 'react';
import { ArrowLeft, UserPlus, Shield, Trash2, Mail, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { formatRelativeTime } from '@/lib/format';
import {
  useTeamMembers,
  usePendingInvitations,
  useInviteTeamMember,
  useRevokeInvitation,
  useChangeTeamMemberRole,
  useRemoveTeamMember,
  useTeamActivity,
  ROLE_LABELS,
  ROLE_COLORS,
  INVITATION_STATUS_COLORS,
  getActivityIcon,
  type TeamRole,
  type TeamMember,
} from '@/lib/graphql/settings';

const roleOptions: TeamRole[] = ['SP_ADMIN', 'AGENT', 'ANALYST'];

export default function TeamSettingsPage() {
  const { activeServiceProvider } = useAuth();
  const toast = useToast();
  const spId = activeServiceProvider?.id || '';

  const { data: membersData, loading: membersLoading, refetch: refetchMembers } = useTeamMembers(spId);
  const { data: invitationsData, loading: invLoading, refetch: refetchInvitations } = usePendingInvitations(spId);
  const { data: activityData } = useTeamActivity(spId);

  const members = membersData?.teamMembers?.items || [];
  const invitations = invitationsData?.pendingInvitations?.items || [];
  const activity = activityData?.teamActivity?.items || [];

  const { inviteTeamMember, loading: inviting } = useInviteTeamMember(spId);
  const { revokeInvitation } = useRevokeInvitation(spId);
  const { changeRole } = useChangeTeamMemberRole(spId);
  const { removeMember } = useRemoveTeamMember(spId);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('AGENT');
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const loading = membersLoading || invLoading;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setError('');
    try {
      await inviteTeamMember(inviteEmail, inviteRole);
      setInviteEmail('');
      setShowInvite(false);
      toast.success('Invitation sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setError('');
    try {
      await changeRole(userId, newRole as TeamRole);
      toast.success('Role updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    }
  }

  async function handleRemove(userId: string) {
    setError('');
    try {
      await removeMember(userId);
      setConfirmRemove(null);
      toast.success('Member removed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    setError('');
    try {
      await revokeInvitation(invitationId);
      toast.success('Invitation revoked');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  }

  function handleRefresh() {
    refetchMembers();
    refetchInvitations();
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
          <button onClick={handleRefresh} disabled={loading}
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
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
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
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-medium text-text-secondary">
                        {(m.fullName || m.username).substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-text-primary font-medium">{m.fullName || m.username}</p>
                        <p className="text-xs text-text-muted">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                      className="px-2 py-0.5 bg-transparent border border-border-secondary rounded text-xs font-medium focus:outline-none focus:border-border-active">
                      {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.status === 'ACTIVE' ? 'bg-status-success/10 text-status-success' :
                      m.status === 'INVITED' ? 'bg-status-warning/10 text-status-warning' :
                      'bg-border-secondary text-text-muted'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted text-xs">
                    {m.createdAt ? formatRelativeTime(m.createdAt) : '—'}
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[inv.role] || ''}`}>
                      {ROLE_LABELS[inv.role] || inv.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INVITATION_STATUS_COLORS[inv.status] || ''}`}>
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

      {/* Team Activity Log (15.9) */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border-primary">
          <h3 className="text-sm font-semibold">Recent Team Activity</h3>
        </div>
        {activity.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No recent team activity</div>
        ) : (
          <div className="divide-y divide-border-primary">
            {activity.slice(0, 15).map((item) => {
              const icon = getActivityIcon(item.type);
              return (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3 hover:bg-bg-hover transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${icon.color}/10`}>
                    <span className="text-sm">{icon.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{item.description}</p>
                    <p className="text-[10px] text-text-muted">
                      {item.actorName}{item.targetName ? ` → ${item.targetName}` : ''}
                    </p>
                  </div>
                  <p className="text-[10px] text-text-muted shrink-0">
                    {item.createdAt ? formatRelativeTime(item.createdAt) : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
