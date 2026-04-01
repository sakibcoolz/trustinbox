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

/** CMS permission matrix */
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
