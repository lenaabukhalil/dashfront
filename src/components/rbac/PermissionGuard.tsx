
import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionKey, PermissionAction } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

interface PermissionGuardProps {
  role?: Role | null | undefined;
  permission: PermissionKey;
  action?: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  action = "read",
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { check } = usePermission();

  if (!check(permission, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface MultiplePermissionGuardProps {
  role?: Role | null | undefined;
  permissions: PermissionKey[];
  action?: PermissionAction;
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function MultiplePermissionGuard({
  permissions,
  action = "read",
  requireAll = false,
  fallback = null,
  children,
}: MultiplePermissionGuardProps) {
  const { hasAny, hasAll } = usePermission();

  const hasAccess = requireAll
    ? hasAll(permissions, action)
    : hasAny(permissions, action);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
