import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Role, PermissionKey, PermissionAction } from "@/lib/permissions";
import { canReadFromMap, canWriteFromMap, getPermission } from "@/lib/permissions";

export function usePermission(_roleOrNull?: Role | null) {
  const { user, permissionsMap } = useAuth();

  return useMemo(() => {
    if (!user) {
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

    /** Signed-in users: enforce JWT `permissions` from backend only (missing code ⇒ no access). */
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
            : canWriteFromMap(permissionsMap, p),
        ),
      hasAll: (perms: PermissionKey[], action: PermissionAction = "read") =>
        perms.every((p) =>
          action === "read"
            ? canReadFromMap(permissionsMap, p)
            : canWriteFromMap(permissionsMap, p),
        ),
      getAll: () => Object.keys(permissionsMap) as PermissionKey[],
      getAllReadable: () =>
        (Object.keys(permissionsMap) as PermissionKey[]).filter((p) =>
          canReadFromMap(permissionsMap, p),
        ),
      getAllWritable: () =>
        (Object.keys(permissionsMap) as PermissionKey[]).filter((p) =>
          canWriteFromMap(permissionsMap, p),
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
        {} as Record<PermissionKey, ReturnType<typeof getPermission>>,
      ),
      isReadOnly: (permission: PermissionKey) =>
        canReadFromMap(permissionsMap, permission) &&
        !canWriteFromMap(permissionsMap, permission),
      fromApi: Object.keys(permissionsMap).length > 0,
    };
  }, [user, permissionsMap]);
}

export type UsePermissionReturn = ReturnType<typeof usePermission>;
