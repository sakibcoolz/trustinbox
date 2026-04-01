/** Role hierarchy for the provider portal */
export const ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  SP_ADMIN: 'SP_ADMIN',
  CONTENT_MANAGER: 'CONTENT_MANAGER',
  AGENT: 'AGENT',
  ANALYST: 'ANALYST',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Ordered from most to least privileged */
const ROLE_HIERARCHY: Role[] = [
  ROLES.PLATFORM_ADMIN,
  ROLES.SP_ADMIN,
  ROLES.CONTENT_MANAGER,
  ROLES.AGENT,
  ROLES.ANALYST,
];

export function hasRole(userRole: string, requiredRole: Role): boolean {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole as Role);
  const requiredIdx = ROLE_HIERARCHY.indexOf(requiredRole);
  if (userIdx === -1) return false;
  return userIdx <= requiredIdx;
}

// ─── Permission System ──────────────────────────────────

export type Permission =
  // Dashboard
  | 'dashboard:view'
  // Customers
  | 'customers:view' | 'customers:export'
  // Notifications
  | 'notifications:view' | 'notifications:send' | 'notifications:template:manage'
  // Conversations
  | 'conversations:view' | 'conversations:reply' | 'conversations:assign'
  // Callbacks
  | 'callbacks:view' | 'callbacks:manage' | 'callbacks:assign'
  // Documents
  | 'documents:view' | 'documents:upload' | 'documents:share' | 'documents:delete'
  // Campaigns
  | 'campaigns:view' | 'campaigns:create' | 'campaigns:launch'
  // Bots
  | 'bots:view' | 'bots:create' | 'bots:deploy'
  // Analytics
  | 'analytics:view' | 'analytics:export'
  // Webhooks
  | 'webhooks:view' | 'webhooks:manage'
  // Compliance
  | 'compliance:view' | 'compliance:manage'
  // Integrations
  | 'integrations:view' | 'integrations:manage'
  // Settings
  | 'settings:view' | 'settings:team:manage' | 'settings:billing:manage'
  // API Keys
  | 'apikeys:view' | 'apikeys:manage';

const ALL_PERMISSIONS: Permission[] = [
  'dashboard:view',
  'customers:view', 'customers:export',
  'notifications:view', 'notifications:send', 'notifications:template:manage',
  'conversations:view', 'conversations:reply', 'conversations:assign',
  'callbacks:view', 'callbacks:manage', 'callbacks:assign',
  'documents:view', 'documents:upload', 'documents:share', 'documents:delete',
  'campaigns:view', 'campaigns:create', 'campaigns:launch',
  'bots:view', 'bots:create', 'bots:deploy',
  'analytics:view', 'analytics:export',
  'webhooks:view', 'webhooks:manage',
  'compliance:view', 'compliance:manage',
  'integrations:view', 'integrations:manage',
  'settings:view', 'settings:team:manage', 'settings:billing:manage',
  'apikeys:view', 'apikeys:manage',
];

export const PERMISSION_MATRIX: Record<Role, Set<Permission>> = {
  PLATFORM_ADMIN: new Set(ALL_PERMISSIONS),
  SP_ADMIN: new Set(ALL_PERMISSIONS),
  CONTENT_MANAGER: new Set<Permission>([
    'dashboard:view',
    'customers:view',
    'notifications:view', 'notifications:send', 'notifications:template:manage',
    'conversations:view', 'conversations:reply',
    'callbacks:view',
    'documents:view', 'documents:upload', 'documents:share',
    'campaigns:view', 'campaigns:create',
    'bots:view',
    'analytics:view',
    'settings:view',
  ]),
  AGENT: new Set<Permission>([
    'dashboard:view',
    'customers:view',
    'notifications:view', 'notifications:send',
    'conversations:view', 'conversations:reply', 'conversations:assign',
    'callbacks:view', 'callbacks:manage', 'callbacks:assign',
    'documents:view', 'documents:upload', 'documents:share',
    'settings:view',
  ]),
  ANALYST: new Set<Permission>([
    'dashboard:view',
    'customers:view', 'customers:export',
    'notifications:view',
    'conversations:view',
    'callbacks:view',
    'documents:view',
    'analytics:view', 'analytics:export',
    'compliance:view',
    'settings:view',
  ]),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.has(permission) ?? false;
}

export function getPermissions(role: Role): Permission[] {
  return Array.from(PERMISSION_MATRIX[role] ?? []);
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function getFeaturePermissions(feature: string): Permission[] {
  return ALL_PERMISSIONS.filter((p) => p.startsWith(`${feature}:`));
}

// ─── Role Display ───────────────────────────────────────

export const ROLE_LABELS: Record<Role, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  SP_ADMIN: 'Admin',
  CONTENT_MANAGER: 'Content Manager',
  AGENT: 'Agent',
  ANALYST: 'Analyst',
};

export const ROLE_COLORS: Record<Role, string> = {
  PLATFORM_ADMIN: 'purple',
  SP_ADMIN: 'info',
  CONTENT_MANAGER: 'warning',
  AGENT: 'success',
  ANALYST: 'cyan',
};

// ─── CMS Permissions (legacy compat) ────────────────────

export const CMS_PERMISSIONS = {
  [ROLES.PLATFORM_ADMIN]: { create: true, edit: true, publish: true, archive: true, delete: true, viewAll: true, manageMedia: true },
  [ROLES.SP_ADMIN]:       { create: true, edit: true, publish: true, archive: true, delete: true, viewAll: true, manageMedia: true },
  [ROLES.CONTENT_MANAGER]:{ create: true, edit: true, publish: true, archive: true, delete: false, viewAll: true, manageMedia: true },
  [ROLES.AGENT]:          { create: true, edit: true, publish: false, archive: false, delete: false, viewAll: false, manageMedia: false },
  [ROLES.ANALYST]:        { create: false, edit: false, publish: false, archive: false, delete: false, viewAll: true, manageMedia: false },
} as const;

export type CMSPermission = keyof (typeof CMS_PERMISSIONS)[typeof ROLES.SP_ADMIN];

export function getCMSPermissions(role: string) {
  return CMS_PERMISSIONS[role as Role] ?? CMS_PERMISSIONS[ROLES.ANALYST];
}
