import type { PermissionsMap } from "@/types/permissions";

export type RoutePermissionsMap = PermissionsMap & Record<string, string | boolean | undefined>;

/**
 * Permission required to access each route (null = any authenticated user).
 * Unknown paths fall back to `global.access` only — see `hasAccessToPath`.
 */
export const ROUTE_PERMISSIONS: Record<string, string | null> = {
  "/dashboard": "global.access",
  "/setup-wizard": "global.access",
  "/delete-wizard": "organizations.manage",
  "/archive-diagnostic": "organizations.view",
  "/organizations": "organizations.view",
  "/locations": "locations.view",
  "/chargers": "chargers.view",
  "/connectors": "chargers.view",
  "/tariffs": "tariffs.manage",
  "/users": "users.view",
  "/users/charging-now": "users.view",
  "/users/charged-today": "users.view",
  "/app-users": "users.view",
  "/monitoring": "chargers.view",
  "/reports": "reports.view",
  "/audit-log": "audit.view",
  "/support": "support.view",
  "/settings": "settings.view",
  "/profile": null,
  "/no-access": null,
};

/** First-match order for post-login and disallowed-route redirects. */
export const ORDERED_ROUTE_KEYS = [
  "/dashboard",
  "/setup-wizard",
  "/delete-wizard",
  "/organizations",
  "/locations",
  "/chargers",
  "/connectors",
  "/tariffs",
  "/users",
  "/monitoring",
  "/reports",
  "/audit-log",
  "/support",
  "/settings",
] as const;

export function hasGlobalAccess(
  permissions: RoutePermissionsMap | null | undefined,
): boolean {
  return permissions?.["global.access"] === true;
}

function permissionValueGranted(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    return normalized === "R" || normalized === "RW";
  }
  return false;
}

/**
 * Route-level access: platform admins (`global.access === true`) see everything;
 * otherwise the required permission key must exist with a truthy R/RW value.
 * Unknown route keys require `global.access`.
 */
export function hasAccess(
  permissions: RoutePermissionsMap | null | undefined,
  routeKey: string,
): boolean {
  if (!permissions || typeof permissions !== "object") return false;
  if (hasGlobalAccess(permissions)) return true;

  const required = ROUTE_PERMISSIONS[routeKey];
  if (required === null) return true;
  if (required === undefined) return false;

  return permissionValueGranted(permissions[required]);
}

export function resolveRouteKey(pathname: string): string | null {
  if (pathname in ROUTE_PERMISSIONS) return pathname;

  const sortedKeys = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (pathname.startsWith(`${key}/`)) return key;
  }
  return null;
}

export function hasAccessToPath(
  permissions: RoutePermissionsMap | null | undefined,
  pathname: string,
): boolean {
  // Notification details are org-scoped by the API; auth-only at the route layer.
  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return true;
  }

  const routeKey = resolveRouteKey(pathname);
  if (routeKey === null) return hasGlobalAccess(permissions);
  return hasAccess(permissions, routeKey);
}

export function getFirstAllowedRoute(
  permissions: RoutePermissionsMap | null | undefined,
): string | null {
  if (hasGlobalAccess(permissions)) return "/dashboard";

  for (const route of ORDERED_ROUTE_KEYS) {
    if (hasAccess(permissions, route)) return route;
  }
  return null;
}

const PERMISSIONS_STORAGE_KEY = "ion_permissions";

export function readStoredRoutePermissions(): RoutePermissionsMap {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw?.trim()) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed != null && typeof parsed === "object" ? (parsed as RoutePermissionsMap) : {};
  } catch {
    return {};
  }
}
