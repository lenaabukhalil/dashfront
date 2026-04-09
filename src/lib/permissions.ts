
import type { PermissionCode, PermissionsMap } from "@/types/permissions";

export type Role = "admin" | "manager" | "engineer" | "operator" | "accountant" | "viewer";

export type PermissionKey = PermissionCode;

export type PermissionAction = "read" | "write";
export type PermissionValue = "R" | "RW" | "-";

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
  const a = map[code as PermissionCode];
  return a === "R" || a === "RW";
}

export function canWriteFromMap(map: PermissionsMap, code: PermissionKey): boolean {
  return map[code as PermissionCode] === "RW";
}

export const RBAC_MATRIX: Record<Role, Record<PermissionKey, PermissionValue>> = {
  admin: {
    "org.logo": "RW", "org.name": "RW", "org.banner": "RW", tariff: "RW",
    "charger.status": "RW", "charger.enable_disable": "RW", "charger.control": "RW",
    notifications: "RW", "chargers.log": "RW", schedule: "RW",
    "users.edit": "RW", "rfid.edit": "RW", "finance.reports": "RW",
    "shift.set": "RW", "shift.collection": "RW",
  },
  manager: {
    "org.logo": "R", "org.name": "RW", "org.banner": "R", tariff: "R",
    "charger.status": "RW", "charger.enable_disable": "R", "charger.control": "RW",
    notifications: "R", "chargers.log": "R", schedule: "RW",
    "users.edit": "RW", "rfid.edit": "RW", "finance.reports": "RW",
    "shift.set": "R", "shift.collection": "RW",
  },
  engineer: {
    "org.logo": "R", "org.name": "R", "org.banner": "R", tariff: "R",
    "charger.status": "RW", "charger.enable_disable": "RW", "charger.control": "R",
    notifications: "R", "chargers.log": "RW", schedule: "RW",
    "users.edit": "-", "rfid.edit": "-", "finance.reports": "-",
    "shift.set": "R", "shift.collection": "-",
  },
  operator: {
    "org.logo": "R", "org.name": "R", "org.banner": "R", tariff: "R",
    "charger.status": "RW", "charger.enable_disable": "-", "charger.control": "RW",
    notifications: "R", "chargers.log": "-", schedule: "-",
    "users.edit": "-", "rfid.edit": "-", "finance.reports": "-",
    "shift.set": "-", "shift.collection": "RW",
  },
  accountant: {
    "org.logo": "R", "org.name": "R", "org.banner": "R", tariff: "R",
    "charger.status": "-", "charger.enable_disable": "-", "charger.control": "-",
    notifications: "-", "chargers.log": "-", schedule: "-",
    "users.edit": "-", "rfid.edit": "R", "finance.reports": "RW",
    "shift.set": "R", "shift.collection": "-",
  },
  viewer: {
    "org.logo": "R", "org.name": "R", "org.banner": "R", tariff: "R",
    "charger.status": "R", "charger.enable_disable": "-", "charger.control": "-",
    notifications: "R", "chargers.log": "R", schedule: "R",
    "users.edit": "-", "rfid.edit": "-", "finance.reports": "R",
    "shift.set": "-", "shift.collection": "-",
  },
};

function getValueFromMatrix(role: Role, code: PermissionKey): PermissionValue {
  return RBAC_MATRIX[role]?.[code] ?? "-";
}

function parseValue(value: PermissionValue): { read: boolean; write: boolean } {
  if (value === "RW") return { read: true, write: true };
  if (value === "R") return { read: true, write: false };
  return { read: false, write: false };
}

export function hasRead(role: Role, permission: PermissionKey): boolean {
  return parseValue(getValueFromMatrix(role, permission)).read;
}

export function hasWrite(role: Role, permission: PermissionKey): boolean {
  return parseValue(getValueFromMatrix(role, permission)).write;
}

export function hasPermission(role: Role, permission: PermissionKey, action: PermissionAction): boolean {
  const p = parseValue(getValueFromMatrix(role, permission));
  return action === "read" ? p.read : p.write;
}

export function getPermission(role: Role, permission: PermissionKey): Permission {
  const p = parseValue(getValueFromMatrix(role, permission));
  return { key: permission, read: p.read, write: p.write };
}

export function getRolePermissions(role: Role): Record<PermissionKey, Permission> {
  const out = {} as Record<PermissionKey, Permission>;
  const matrix = RBAC_MATRIX[role];
  if (!matrix) return out;
  (Object.keys(matrix) as PermissionKey[]).forEach((key) => {
    out[key] = getPermission(role, key);
  });
  return out;
}

export function hasAnyPermission(
  role: Role,
  permissions: PermissionKey[],
  action: PermissionAction = "read"
): boolean {
  return permissions.some((p) => hasPermission(role, p, action));
}

export function hasAllPermissions(
  role: Role,
  permissions: PermissionKey[],
  action: PermissionAction = "read"
): boolean {
  return permissions.every((p) => hasPermission(role, p, action));
}

export function getAccessiblePermissions(
  role: Role,
  action?: PermissionAction
): PermissionKey[] {
  const matrix = RBAC_MATRIX[role];
  if (!matrix) return [];
  return (Object.keys(matrix) as PermissionKey[]).filter((key) => {
    const v = matrix[key];
    if (v === "-") return false;
    if (!action) return true;
    const p = parseValue(v);
    return action === "read" ? p.read : p.write;
  });
}
