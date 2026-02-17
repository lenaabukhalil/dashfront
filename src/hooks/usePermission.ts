import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { userTypeToRole } from "@/lib/rbac-helpers";
import type { Role, PermissionKey, PermissionAction } from "@/lib/permissions";
import {
  canReadFromMap,
  canWriteFromMap,
  hasRead,
  hasWrite,
  hasPermission,
  getPermission,
  getRolePermissions,
  hasAnyPermission,
  hasAllPermissions,
  getAccessiblePermissions,
} from "@/lib/permissions";

export function usePermission(roleOrNull?: Role | null) {
  const { user, permissionsMap } = useAuth();
  const role = roleOrNull ?? (user ? userTypeToRole(user.userType) : null);
  const useApiMap = useMemo(
    () => Object.keys(permissionsMap).length > 0,
    [permissionsMap]
  );

  return useMemo(() => {
    if (!role && !useApiMap) {
      return {
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
        isReadOnly: () => false,
        fromApi: false,
      };
    }

    if (useApiMap) {
      return {
        canRead: (permission: PermissionKey) => canReadFromMap(permissionsMap, permission),
        canWrite: (permission: PermissionKey) => canWriteFromMap(permissionsMap, permission),
        check: (permission: PermissionKey, action: PermissionAction) =>
          action === "read"
            ? canReadFromMap(permissionsMap, permission)
            : canWriteFromMap(permissionsMap, permission),
        get: (permission: PermissionKey) => ({
          key: permission,
          read: canReadFromMap(permissionsMap, permission),
          write: canWriteFromMap(permissionsMap, permission),
        }),
        hasAny: (perms: PermissionKey[], action: PermissionAction = "read") =>
          perms.some((p) =>
            action === "read"
              ? canReadFromMap(permissionsMap, p)
              : canWriteFromMap(permissionsMap, p)
          ),
        hasAll: (perms: PermissionKey[], action: PermissionAction = "read") =>
          perms.every((p) =>
            action === "read"
              ? canReadFromMap(permissionsMap, p)
              : canWriteFromMap(permissionsMap, p)
          ),
        getAll: () => Object.keys(permissionsMap) as PermissionKey[],
        getAllReadable: () =>
          (Object.keys(permissionsMap) as PermissionKey[]).filter((p) =>
            canReadFromMap(permissionsMap, p)
          ),
        getAllWritable: () =>
          (Object.keys(permissionsMap) as PermissionKey[]).filter((p) =>
            canWriteFromMap(permissionsMap, p)
          ),
        rolePermissions: (Object.keys(permissionsMap) as PermissionKey[]).reduce(
          (acc, key) => {
            acc[key] = {
              key,
              read: canReadFromMap(permissionsMap, key),
              write: canWriteFromMap(permissionsMap, key),
            };
            return acc;
          },
          {} as Record<PermissionKey, ReturnType<typeof getPermission>>
        ),
        isReadOnly: (permission: PermissionKey) =>
          canReadFromMap(permissionsMap, permission) &&
          !canWriteFromMap(permissionsMap, permission),
        fromApi: true,
      };
    }

    return {
      canRead: (permission: PermissionKey) => hasRead(role!, permission),
      canWrite: (permission: PermissionKey) => hasWrite(role!, permission),
      check: (permission: PermissionKey, action: PermissionAction) =>
        hasPermission(role!, permission, action),
      get: (permission: PermissionKey) => getPermission(role!, permission),
      hasAny: (
        perms: PermissionKey[],
        action: PermissionAction = "read"
      ) => hasAnyPermission(role!, perms, action),
      hasAll: (
        perms: PermissionKey[],
        action: PermissionAction = "read"
      ) => hasAllPermissions(role!, perms, action),
      getAll: () => getAccessiblePermissions(role!),
      getAllReadable: () => getAccessiblePermissions(role!, "read"),
      getAllWritable: () => getAccessiblePermissions(role!, "write"),
      rolePermissions: getRolePermissions(role!),
      isReadOnly: (permission: PermissionKey) =>
        hasRead(role!, permission) && !hasWrite(role!, permission),
      fromApi: false,
    };
  }, [role, permissionsMap, useApiMap]);
}

export type UsePermissionReturn = ReturnType<typeof usePermission>;
