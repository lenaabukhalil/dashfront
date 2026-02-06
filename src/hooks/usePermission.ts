import { useMemo } from "react";
import type { Role, PermissionKey, PermissionAction } from "@/lib/permissions";
import {
  hasRead,
  hasWrite,
  hasPermission,
  getPermission,
  getRolePermissions,
  hasAnyPermission,
  hasAllPermissions,
  getAccessiblePermissions,
} from "@/lib/permissions";

/**
 * React hook for managing permissions based on user role
 * 
 * @param role - The user's role
 * @returns Object with permission checking helpers
 * 
 * @example
 * ```tsx
 * const { canRead, canWrite, check } = usePermission("admin");
 * 
 * if (canRead("org.logo")) {
 *   // Show logo
 * }
 * 
 * if (canWrite("charger.chargerControl")) {
 *   // Enable charger control button
 * }
 * 
 * if (check("finance.financialReports", "write")) {
 *   // Show edit button
 * }
 * ```
 */
export function usePermission(role: Role | null | undefined) {
  const permissions = useMemo(() => {
    if (!role) {
      return {
        // Return all false helpers when no role
        canRead: () => false,
        canWrite: () => false,
        check: () => false,
        get: () => ({ key: "" as PermissionKey, read: false, write: false }),
        hasAny: () => false,
        hasAll: () => false,
        getAll: () => [] as PermissionKey[],
        getAllReadable: () => [] as PermissionKey[],
        getAllWritable: () => [] as PermissionKey[],
        rolePermissions: {} as Record<PermissionKey, ReturnType<typeof getPermission>>,
      };
    }

    return {
      /**
       * Checks if the role has read access to a permission
       */
      canRead: (permission: PermissionKey): boolean => {
        return hasRead(role, permission);
      },

      /**
       * Checks if the role has write access to a permission
       */
      canWrite: (permission: PermissionKey): boolean => {
        return hasWrite(role, permission);
      },

      /**
       * Checks if the role has a specific action (read/write) for a permission
       */
      check: (permission: PermissionKey, action: PermissionAction): boolean => {
        return hasPermission(role, permission, action);
      },

      /**
       * Gets the full permission object for a permission key
       */
      get: (permission: PermissionKey) => {
        return getPermission(role, permission);
      },

      /**
       * Checks if the role has any of the specified permissions
       */
      hasAny: (
        permissions: PermissionKey[],
        action: PermissionAction = "read"
      ): boolean => {
        return hasAnyPermission(role, permissions, action);
      },

      /**
       * Checks if the role has all of the specified permissions
       */
      hasAll: (
        permissions: PermissionKey[],
        action: PermissionAction = "read"
      ): boolean => {
        return hasAllPermissions(role, permissions, action);
      },

      /**
       * Gets all permission keys the role has access to
       */
      getAll: (): PermissionKey[] => {
        return getAccessiblePermissions(role);
      },

      /**
       * Gets all permission keys the role can read
       */
      getAllReadable: (): PermissionKey[] => {
        return getAccessiblePermissions(role, "read");
      },

      /**
       * Gets all permission keys the role can write
       */
      getAllWritable: (): PermissionKey[] => {
        return getAccessiblePermissions(role, "write");
      },

      /**
       * Gets all permissions for the role as a record
       */
      rolePermissions: getRolePermissions(role),
    };
  }, [role]);

  return permissions;
}

/**
 * Type for the return value of usePermission hook
 */
export type UsePermissionReturn = ReturnType<typeof usePermission>;
