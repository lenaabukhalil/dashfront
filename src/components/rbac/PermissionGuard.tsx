import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission, hasAnyPermission } from "@/lib/evse-permissions";
import type { PermissionKey, PermissionAction } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import type { AccessLevel } from "@/lib/evse-permissions";

interface PermissionGuardProps {
  role?: Role | null | undefined;
  permission: PermissionKey;
  action?: PermissionAction;
  /** When set, overrides `action` → AccessLevel mapping (read=R, write=RW). */
  required?: AccessLevel;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  action = "read",
  required,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { permissions } = useAuth();
  const level: AccessLevel = required ?? (action === "write" ? "RW" : "R");

  if (!hasPermission(permissions, permission, level)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface MultiplePermissionGuardProps {
  role?: Role | null | undefined;
  permissions: PermissionKey[];
  action?: PermissionAction;
  required?: AccessLevel;
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function MultiplePermissionGuard({
  permissions,
  action = "read",
  required,
  requireAll = false,
  fallback = null,
  children,
}: MultiplePermissionGuardProps) {
  const { permissions: map } = useAuth();
  const level: AccessLevel = required ?? (action === "write" ? "RW" : "R");

  const hasAccess = requireAll
    ? permissions.every((c) => hasPermission(map, c, level))
    : hasAnyPermission(map, permissions as string[], level);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
