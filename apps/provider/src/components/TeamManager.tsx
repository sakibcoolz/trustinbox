'use client';

import { useState } from 'react';
import { UserPlus, Shield, Trash2, Mail } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Agent' | 'Viewer';
  status: 'Active' | 'Pending';
}

interface TeamManagerProps {
  members?: TeamMember[];
  onInvite?: (email: string, role: string) => void;
  onRemove?: (id: string) => void;
  onRoleChange?: (id: string, role: string) => void;
}

const defaultMembers: TeamMember[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah@acme.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'James Wilson', email: 'james@acme.com', role: 'Agent', status: 'Active' },
  { id: '3', name: 'Pending Invite', email: 'new@acme.com', role: 'Viewer', status: 'Pending' },
];

const roleColors: Record<string, string> = {
  Admin: 'bg-accent-purple/10 text-accent-purple',
  Agent: 'bg-accent-blue/10 text-accent-blue',
  Viewer: 'bg-border-secondary text-text-muted',
};

export default function TeamManager({ members = defaultMembers, onInvite, onRemove, onRoleChange }: TeamManagerProps) {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Agent');

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowInvite(!showInvite)}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          <UserPlus size={14} /> Invite Member
        </button>
      </div>

      {showInvite && (
        <div className="bg-bg-card border border-accent-blue/30 rounded-xl p-4 flex gap-2">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
            placeholder="email@company.com" />
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary focus:outline-none focus:border-border-active">
            <option>Admin</option><option>Agent</option><option>Viewer</option>
          </select>
          <button onClick={() => { onInvite?.(email, role); setShowInvite(false); setEmail(''); }}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium flex items-center gap-1.5"><Mail size={14} />Send</button>
          <button onClick={() => setShowInvite(false)} className="text-sm text-text-muted">Cancel</button>
        </div>
      )}

      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary text-text-muted">
              <th className="text-left p-3 font-medium">Member</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border-primary last:border-0 hover:bg-bg-hover">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center text-xs font-bold">
                      {m.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="text-text-primary font-medium">{m.name}</div>
                      <div className="text-text-muted text-xs">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <select value={m.role} onChange={(e) => onRoleChange?.(m.id, e.target.value)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${roleColors[m.role]}`}>
                    <option>Admin</option><option>Agent</option><option>Viewer</option>
                  </select>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'Active' ? 'bg-status-success/10 text-status-success' : 'bg-accent-orange/10 text-accent-orange'}`}>
                    {m.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button className="p-1.5 rounded hover:bg-bg-hover text-text-muted"><Shield size={14} /></button>
                    <button onClick={() => onRemove?.(m.id)} className="p-1.5 rounded hover:bg-bg-hover text-status-error"><Trash2 size={14} /></button>
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
