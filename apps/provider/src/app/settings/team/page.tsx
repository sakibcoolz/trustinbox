'use client';

import { useState } from 'react';
import { ArrowLeft, UserPlus, Shield, MoreVertical, Mail, Trash2 } from 'lucide-react';
import Link from 'next/link';

const mockMembers = [
  { id: '1', name: 'Jane Smith', email: 'jane@acme.com', role: 'Admin', status: 'Active', lastActive: '2 min ago', avatar: 'JS' },
  { id: '2', name: 'Sarah Kim', email: 'sarah@acme.com', role: 'Agent', status: 'Active', lastActive: '15 min ago', avatar: 'SK' },
  { id: '3', name: 'Mike Torres', email: 'mike@acme.com', role: 'Agent', status: 'Active', lastActive: '1 hr ago', avatar: 'MT' },
  { id: '4', name: 'Alex Chen', email: 'alex@acme.com', role: 'Viewer', status: 'Active', lastActive: '3 hrs ago', avatar: 'AC' },
  { id: '5', name: 'Robin Patel', email: 'robin@acme.com', role: 'Agent', status: 'Invited', lastActive: '—', avatar: 'RP' },
];

const roleColors: Record<string, string> = {
  Admin: 'bg-accent-purple/10 text-accent-purple',
  Agent: 'bg-accent-blue/10 text-accent-blue',
  Viewer: 'bg-border-secondary text-text-muted',
};

const statusColors: Record<string, string> = {
  Active: 'bg-status-success/10 text-status-success',
  Invited: 'bg-status-warning/10 text-status-warning',
  Suspended: 'bg-status-error/10 text-status-error',
};

export default function TeamSettingsPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Agent');

  return (
    <div className="p-8 space-y-6">
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
        <button onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      {showInvite && (
        <div className="bg-bg-card border border-accent-blue/30 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold">Invite Team Member</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
                  placeholder="colleague@acme.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
                <option>Admin</option>
                <option>Agent</option>
                <option>Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowInvite(false)} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary">Cancel</button>
            <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">Send Invite</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: String(mockMembers.length) },
          { label: 'Admins', value: String(mockMembers.filter((m) => m.role === 'Admin').length) },
          { label: 'Agents', value: String(mockMembers.filter((m) => m.role === 'Agent').length) },
          { label: 'Pending Invites', value: String(mockMembers.filter((m) => m.status === 'Invited').length) },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="text-lg font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Members Table */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-xs text-text-muted">
              <th className="px-4 py-3 text-left font-medium">Member</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Last Active</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockMembers.map((m) => (
              <tr key={m.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-medium text-text-secondary">{m.avatar}</div>
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-text-muted">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[m.role]}`}>{m.role}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[m.status]}`}>{m.status}</span></td>
                <td className="px-4 py-3 text-text-muted">{m.lastActive}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-muted"><Shield size={14} /></button>
                    <button className="p-1.5 rounded hover:bg-bg-hover transition-colors text-status-error"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
