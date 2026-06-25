import type { RbacAllowedPermission, RbacPermissionSurface } from "@/services/api";

export const PLATFORM_ADMIN_CODE = "platform_admin";
export const GLOBAL_ACCESS_KEY = "global.access";
export const ROLE_CODE_PATTERN = /^[a-z][a-z0-9_]{2,49}$/;

export function filterRbacPermissionsBySurface(
  permissions: RbacAllowedPermission[],
  surface: RbacPermissionSurface,
): RbacAllowedPermission[] {
  return permissions.filter((p) => p.surface === surface);
}

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

export function groupRbacPermissionsBySurface(
  permissions: RbacAllowedPermission[],
): Record<RbacPermissionSurface, Map<string, RbacAllowedPermission[]>> {
  const result: Record<RbacPermissionSurface, Map<string, RbacAllowedPermission[]>> = {
    dashboard: new Map<string, RbacAllowedPermission[]>(),
    mobile: new Map<string, RbacAllowedPermission[]>(),
    cpo: new Map<string, RbacAllowedPermission[]>(),
  };
  for (const perm of permissions) {
    const surface = perm.surface;
    const category = (perm.category || "Other").trim();
    const bucket = result[surface] ?? result.dashboard;
    if (!bucket.has(category)) bucket.set(category, []);
    bucket.get(category)!.push(perm);
  }
  for (const surface of Object.keys(result) as RbacPermissionSurface[]) {
    for (const [, list] of result[surface]) {
      list.sort(
        (a, b) =>
          (a.sort ?? 999) - (b.sort ?? 999) || a.description.localeCompare(b.description),
      );
    }
  }
  return result;
}

export function buildSwitchState(
  allowed: RbacAllowedPermission[],
  rolePermissions: Record<string, boolean | "R" | "RW" | string>,
): Record<string, boolean> {
  const allowedKeys = new Set(allowed.map((p) => p.key));
  for (const key of Object.keys(rolePermissions)) {
    if (!allowedKeys.has(key)) {
      console.warn(`Unknown permission key from API: ${key}`);
    }
  }
  return Object.fromEntries(
    allowed.map((p) => {
      const v = rolePermissions[p.key];
      const isOn = v === true || v === "R" || v === "RW";
      return [p.key, isOn];
    }),
  );
}

export function defaultSwitchState(permissions: RbacAllowedPermission[]): Record<string, boolean> {
  return Object.fromEntries(permissions.map((p) => [p.key, false]));
}
