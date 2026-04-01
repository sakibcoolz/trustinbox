'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Users, Eye, Pencil, Send, Archive, Trash2, Image, Check, X } from 'lucide-react';
import { ROLES, CMS_PERMISSIONS, type Role } from '@/lib/roles';
import { useCMSPermissions } from '@/hooks/useAuth';

const ROLE_META: Record<string, { label: string; desc: string; color: string; icon: React.ComponentType<{ size: number; className?: string }> }> = {
  PLATFORM_ADMIN: { label: 'Platform Admin', desc: 'Full platform control. All CMS permissions.', color: 'bg-status-error/10 text-status-error', icon: Shield },
  SP_ADMIN: { label: 'SP Admin', desc: 'Full CMS control for the organization.', color: 'bg-accent-purple/10 text-accent-purple', icon: Shield },
  CONTENT_MANAGER: { label: 'Content Manager', desc: 'Create, edit, publish, archive. Cannot delete.', color: 'bg-accent-blue/10 text-accent-blue', icon: Pencil },
  AGENT: { label: 'Agent', desc: 'Create and edit drafts only. No publish or media.', color: 'bg-status-warning/10 text-status-warning', icon: Users },
  ANALYST: { label: 'Analyst', desc: 'Read-only access. View all content.', color: 'bg-border-secondary text-text-muted', icon: Eye },
};

const PERM_ICONS: Record<string, { icon: React.ComponentType<{ size: number; className?: string }>; label: string }> = {
  create: { icon: Pencil, label: 'Create' },
  edit: { icon: Pencil, label: 'Edit' },
  publish: { icon: Send, label: 'Publish' },
  archive: { icon: Archive, label: 'Archive' },
  delete: { icon: Trash2, label: 'Delete' },
  viewAll: { icon: Eye, label: 'View All' },
  manageMedia: { icon: Image, label: 'Media' },
};

const ROLE_ORDER: Role[] = [ROLES.PLATFORM_ADMIN, ROLES.SP_ADMIN, ROLES.CONTENT_MANAGER, ROLES.AGENT, ROLES.ANALYST];

export default function CMSRolesPage() {
  const { role: currentRole, loading } = useCMSPermissions();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  if (loading) return <div className="p-8 text-text-muted">Loading…</div>;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/cms" className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary mb-2">
            <ArrowLeft size={14} /> Back to CMS
          </Link>
          <h1 className="text-2xl font-semibold">CMS Roles & Permissions</h1>
          <p className="text-text-secondary text-sm mt-1">
            Your current role: <span className="font-medium text-text-primary">{ROLE_META[currentRole]?.label ?? currentRole}</span>
          </p>
        </div>
      </div>

      {/* Permission matrix */}
      <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-primary">
              <th className="text-left px-4 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">Role</th>
              {Object.entries(PERM_ICONS).map(([key, meta]) => (
                <th key={key} className="text-center px-3 py-3 text-xs text-text-muted font-medium uppercase tracking-wider">{meta.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLE_ORDER.map((role) => {
              const meta = ROLE_META[role];
              const perms = CMS_PERMISSIONS[role];
              const isActive = role === currentRole;
              return (
                <tr key={role}
                  className={`border-b border-border-primary last:border-0 cursor-pointer transition-colors ${
                    isActive ? 'bg-accent-blue/5' : 'hover:bg-bg-hover'
                  } ${selectedRole === role ? 'bg-bg-hover' : ''}`}
                  onClick={() => setSelectedRole(selectedRole === role ? null : role)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      {isActive && <span className="text-[10px] text-accent-blue">(you)</span>}
                    </div>
                  </td>
                  {Object.keys(PERM_ICONS).map((key) => (
                    <td key={key} className="text-center px-3 py-3">
                      {perms[key as keyof typeof perms] ? (
                        <Check size={14} className="inline text-status-success" />
                      ) : (
                        <X size={14} className="inline text-text-muted/30" />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role detail card */}
      {selectedRole && (
        <div className="bg-bg-card border border-border-primary rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            {(() => { const Icon = ROLE_META[selectedRole].icon; return <Icon size={20} className="text-accent-blue" />; })()}
            <div>
              <h3 className="text-lg font-semibold">{ROLE_META[selectedRole].label}</h3>
              <p className="text-sm text-text-muted">{ROLE_META[selectedRole].desc}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(CMS_PERMISSIONS[selectedRole]).map(([key, val]) => (
              <div key={key} className={`px-3 py-2 rounded-lg border ${val ? 'border-status-success/20 bg-status-success/5' : 'border-border-secondary bg-bg-secondary'}`}>
                <p className="text-xs font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className={`text-[11px] mt-0.5 ${val ? 'text-status-success' : 'text-text-muted'}`}>{val ? 'Allowed' : 'Denied'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 px-4 py-3 bg-bg-secondary border border-border-primary rounded-lg">
        <p className="text-xs text-text-muted">
          <strong className="text-text-secondary">Note:</strong> Role assignments are managed by SP Admins in{' '}
          <Link href="/settings/team" className="text-accent-blue hover:underline">Team Settings</Link>.
          Contact your administrator to change your CMS role.
        </p>
      </div>
    </div>
  );
}
