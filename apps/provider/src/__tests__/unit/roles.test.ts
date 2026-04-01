import { describe, it, expect } from 'vitest';
import {
  hasRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
  getFeaturePermissions,
  getCMSPermissions,
  ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  type Role,
  type Permission,
} from '@/lib/roles';

describe('roles', () => {
  describe('hasRole', () => {
    it('PLATFORM_ADMIN has all roles', () => {
      expect(hasRole('PLATFORM_ADMIN', 'ANALYST')).toBe(true);
      expect(hasRole('PLATFORM_ADMIN', 'AGENT')).toBe(true);
      expect(hasRole('PLATFORM_ADMIN', 'SP_ADMIN')).toBe(true);
      expect(hasRole('PLATFORM_ADMIN', 'PLATFORM_ADMIN')).toBe(true);
    });

    it('ANALYST only has ANALYST', () => {
      expect(hasRole('ANALYST', 'ANALYST')).toBe(true);
      expect(hasRole('ANALYST', 'AGENT')).toBe(false);
      expect(hasRole('ANALYST', 'SP_ADMIN')).toBe(false);
    });

    it('AGENT has AGENT and below', () => {
      expect(hasRole('AGENT', 'AGENT')).toBe(true);
      expect(hasRole('AGENT', 'ANALYST')).toBe(true);
      expect(hasRole('AGENT', 'CONTENT_MANAGER')).toBe(false);
    });

    it('unknown role returns false', () => {
      expect(hasRole('UNKNOWN', 'ANALYST')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('SP_ADMIN has all permissions', () => {
      expect(hasPermission('SP_ADMIN', 'webhooks:manage')).toBe(true);
      expect(hasPermission('SP_ADMIN', 'settings:billing:manage')).toBe(true);
    });

    it('ANALYST cannot manage webhooks', () => {
      expect(hasPermission('ANALYST', 'webhooks:manage')).toBe(false);
      expect(hasPermission('ANALYST', 'webhooks:view')).toBe(false);
    });

    it('ANALYST can view dashboard and analytics', () => {
      expect(hasPermission('ANALYST', 'dashboard:view')).toBe(true);
      expect(hasPermission('ANALYST', 'analytics:view')).toBe(true);
      expect(hasPermission('ANALYST', 'analytics:export')).toBe(true);
    });

    it('AGENT can manage callbacks', () => {
      expect(hasPermission('AGENT', 'callbacks:manage')).toBe(true);
      expect(hasPermission('AGENT', 'callbacks:assign')).toBe(true);
    });

    it('CONTENT_MANAGER can create campaigns but not launch', () => {
      expect(hasPermission('CONTENT_MANAGER', 'campaigns:view')).toBe(true);
      expect(hasPermission('CONTENT_MANAGER', 'campaigns:create')).toBe(true);
      expect(hasPermission('CONTENT_MANAGER', 'campaigns:launch')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true when role has all requested permissions', () => {
      expect(hasAllPermissions('SP_ADMIN', ['webhooks:view', 'webhooks:manage'])).toBe(true);
    });

    it('returns false when role lacks any requested permission', () => {
      expect(hasAllPermissions('ANALYST', ['analytics:view', 'webhooks:manage'])).toBe(false);
    });

    it('returns true for empty array', () => {
      expect(hasAllPermissions('ANALYST', [])).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when role has at least one', () => {
      expect(hasAnyPermission('ANALYST', ['webhooks:manage', 'analytics:view'])).toBe(true);
    });

    it('returns false when role has none', () => {
      expect(hasAnyPermission('ANALYST', ['webhooks:manage', 'integrations:manage'])).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(hasAnyPermission('ANALYST', [])).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('returns permissions array for a role', () => {
      const perms = getPermissions('ANALYST');
      expect(perms).toContain('dashboard:view');
      expect(perms).toContain('analytics:view');
      expect(perms).not.toContain('webhooks:manage');
    });

    it('SP_ADMIN has more permissions than ANALYST', () => {
      const adminPerms = getPermissions('SP_ADMIN');
      const analystPerms = getPermissions('ANALYST');
      expect(adminPerms.length).toBeGreaterThan(analystPerms.length);
    });
  });

  describe('getFeaturePermissions', () => {
    it('returns all permissions for a feature', () => {
      const webhookPerms = getFeaturePermissions('webhooks');
      expect(webhookPerms).toContain('webhooks:view');
      expect(webhookPerms).toContain('webhooks:manage');
      expect(webhookPerms).toHaveLength(2);
    });

    it('returns all campaign permissions', () => {
      const perms = getFeaturePermissions('campaigns');
      expect(perms).toEqual(expect.arrayContaining(['campaigns:view', 'campaigns:create', 'campaigns:launch']));
    });
  });

  describe('getCMSPermissions', () => {
    it('SP_ADMIN has full CMS access', () => {
      const perms = getCMSPermissions('SP_ADMIN');
      expect(perms.create).toBe(true);
      expect(perms.edit).toBe(true);
      expect(perms.publish).toBe(true);
      expect(perms.delete).toBe(true);
    });

    it('ANALYST has read-only CMS access', () => {
      const perms = getCMSPermissions('ANALYST');
      expect(perms.create).toBe(false);
      expect(perms.edit).toBe(false);
      expect(perms.viewAll).toBe(true);
    });

    it('CONTENT_MANAGER cannot delete', () => {
      const perms = getCMSPermissions('CONTENT_MANAGER');
      expect(perms.create).toBe(true);
      expect(perms.publish).toBe(true);
      expect(perms.delete).toBe(false);
    });
  });

  describe('ROLE_LABELS', () => {
    it('has labels for all roles', () => {
      Object.keys(ROLES).forEach((role) => {
        expect(ROLE_LABELS[role as Role]).toBeDefined();
        expect(typeof ROLE_LABELS[role as Role]).toBe('string');
      });
    });
  });

  describe('ROLE_COLORS', () => {
    it('has colors for all roles', () => {
      Object.keys(ROLES).forEach((role) => {
        expect(ROLE_COLORS[role as Role]).toBeDefined();
      });
    });
  });
});
