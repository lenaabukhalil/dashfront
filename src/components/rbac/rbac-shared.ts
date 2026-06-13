import type { RbacAllowedPermission } from "@/services/api";

export const PLATFORM_ADMIN_CODE = "platform_admin";
export const GLOBAL_ACCESS_KEY = "global.access";
export const ROLE_CODE_PATTERN = /^[a-z][a-z0-9_]{2,49}$/;

export function groupRbacPermissions(permissions: RbacAllowedPermission[]) {
  const groups = new Map<string, RbacAllowedPermission[]>();
  for (const perm of permissions) {
    const category = perm.category.trim() || "Other";
    const list = groups.get(category) ?? [];
    list.push(perm);
    groups.set(category, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function buildSwitchState(
  allowed: RbacAllowedPermission[],
  rolePermissions: Record<string, boolean>,
): Record<string, boolean> {
  const allowedKeys = new Set(allowed.map((p) => p.key));
  for (const key of Object.keys(rolePermissions)) {
    if (!allowedKeys.has(key)) {
      console.warn(`Unknown permission key from API: ${key}`);
    }
  }
  return Object.fromEntries(allowed.map((p) => [p.key, rolePermissions[p.key] === true]));
}

export function defaultSwitchState(permissions: RbacAllowedPermission[]): Record<string, boolean> {
  return Object.fromEntries(permissions.map((p) => [p.key, false]));
}
