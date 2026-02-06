/**
 * PermissionGuard Component
 * 
 * A reusable component for conditionally rendering content based on permissions
 */

import { ReactNode } from "react";
import { usePermission } from "@/hooks/usePermission";
import type { PermissionKey, PermissionAction } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";

interface PermissionGuardProps {
  role: Role | null | undefined;
  permission: PermissionKey;
  action?: PermissionAction;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * PermissionGuard - Conditionally renders children based on permission
 * 
 * @example
 * ```tsx
 * <PermissionGuard 
 *   role={userRole} 
 *   permission="org.logo" 
 *   action="write"
 * >
 *   <EditLogoButton />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  role,
  permission,
  action = "read",
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { check } = usePermission(role);

  if (!check(permission, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface MultiplePermissionGuardProps {
  role: Role | null | undefined;
  permissions: PermissionKey[];
  action?: PermissionAction;
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * MultiplePermissionGuard - Conditionally renders children based on multiple permissions
 * 
 * @example
 * ```tsx
 * <MultiplePermissionGuard 
 *   role={userRole} 
 *   permissions={["org.logo", "org.name"]}
 *   requireAll={true}
 * >
 *   <AdvancedEditor />
 * </MultiplePermissionGuard>
 * ```
 */
export function MultiplePermissionGuard({
  role,
  permissions,
  action = "read",
  requireAll = false,
  fallback = null,
  children,
}: MultiplePermissionGuardProps) {
  const { hasAny, hasAll } = usePermission(role);

  const hasAccess = requireAll
    ? hasAll(permissions, action)
    : hasAny(permissions, action);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
