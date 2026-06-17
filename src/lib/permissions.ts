
import type { PermissionCode, PermissionsMap } from "@/types/permissions";

export type Role = "admin" | "manager" | "engineer" | "operator" | "accountant" | "viewer";

export type PermissionKey = PermissionCode;

export type PermissionAction = "read" | "write";

export interface Permission {
  key: PermissionKey;
  read: boolean;
  write: boolean;
}

export function parseAccess(access: "R" | "RW" | string | undefined): { read: boolean; write: boolean } {
  const a = (access || "").toUpperCase();
  if (a === "RW") return { read: true, write: true };
  if (a === "R") return { read: true, write: false };
  return { read: false, write: false };
}

export function canReadFromMap(map: PermissionsMap, code: PermissionKey): boolean {
  const a = map[code as PermissionCode] as "R" | "RW" | boolean | undefined;
  if (a === true) return true;
  return a === "R" || a === "RW";
}

export function canWriteFromMap(map: PermissionsMap, code: PermissionKey): boolean {
  const a = map[code as PermissionCode] as "R" | "RW" | boolean | undefined;
  if (a === true) return true;
  return a === "RW";
}

/** JWT `permissions` object from login/me. */
export {
  PERMISSION_CODES,
  type AccessLevel,
  type Permissions,
  hasPermission as hasApiPermission,
  canRead as canReadApiPermission,
  canWrite as canWriteApiPermission,
  hasAnyPermission as hasAnyApiPermission,
} from "./evse-permissions";
