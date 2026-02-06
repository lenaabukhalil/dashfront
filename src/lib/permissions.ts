/**
 * RBAC (Role-Based Access Control) System
 * 
 * This file contains the complete permission matrix and utility functions
 * for managing role-based access control in the application.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Available roles in the system
 */
export type Role = "admin" | "manager" | "engineer" | "operator" | "accountant";

/**
 * Permission action types
 */
export type PermissionAction = "read" | "write";

/**
 * Permission value types
 */
export type PermissionValue = "R" | "W" | "RW" | "-";

/**
 * Organization permissions
 */
export type OrgPermissionKey =
  | "org.logo"
  | "org.name"
  | "org.banner"
  | "org.tariff";

/**
 * Charger permissions
 */
export type ChargerPermissionKey =
  | "charger.chargerStatus"
  | "charger.enableDisableCharger"
  | "charger.chargerControl"
  | "charger.notifications"
  | "charger.chargersLog"
  | "charger.schedule";

/**
 * Users permissions
 */
export type UsersPermissionKey = "users.editUsers" | "users.editRFID";

/**
 * Finance permissions
 */
export type FinancePermissionKey =
  | "finance.financialReports"
  | "finance.setShift"
  | "finance.shiftCollection";

/**
 * All permission keys combined
 */
export type PermissionKey =
  | OrgPermissionKey
  | ChargerPermissionKey
  | UsersPermissionKey
  | FinancePermissionKey;

/**
 * Permission object structure
 */
export interface Permission {
  key: PermissionKey;
  read: boolean;
  write: boolean;
}

/**
 * RBAC structure mapping roles to their permissions
 */
export type RBACStructure = Record<Role, Record<PermissionKey, PermissionValue>>;

// ============================================================================
// PERMISSION MATRIX
// ============================================================================

/**
 * Complete RBAC permission matrix
 * 
 * Format: R = Read, W = Write, RW = Read & Write, - = No access
 * 
 * Matrix structure:
 * Org: logo, name, banner, tariff
 * Charger: chargerStatus, enableDisableCharger, chargerControl, notifications, chargersLog, schedule
 * Users: editUsers, editRFID
 * Finance: financialReports, setShift, shiftCollection
 */
export const RBAC_MATRIX: RBACStructure = {
  admin: {
    // Org permissions
    "org.logo": "RW",
    "org.name": "RW",
    "org.banner": "RW",
    "org.tariff": "RW",
    // Charger permissions
    "charger.chargerStatus": "RW",
    "charger.enableDisableCharger": "RW",
    "charger.chargerControl": "RW",
    "charger.notifications": "R",
    "charger.chargersLog": "R",
    "charger.schedule": "RW",
    // Users permissions
    "users.editUsers": "RW",
    "users.editRFID": "RW",
    // Finance permissions
    "finance.financialReports": "R",
    "finance.setShift": "RW",
    "finance.shiftCollection": "R",
  },
  manager: {
    // Org permissions
    "org.logo": "R",
    "org.name": "R",
    "org.banner": "R",
    "org.tariff": "R",
    // Charger permissions
    "charger.chargerStatus": "RW",
    "charger.enableDisableCharger": "-",
    "charger.chargerControl": "RW",
    "charger.notifications": "R",
    "charger.chargersLog": "-",
    "charger.schedule": "RW",
    // Users permissions
    "users.editUsers": "RW",
    "users.editRFID": "RW",
    // Finance permissions
    "finance.financialReports": "RW",
    "finance.setShift": "R",
    "finance.shiftCollection": "RW",
  },
  engineer: {
    // Org permissions
    "org.logo": "R",
    "org.name": "R",
    "org.banner": "R",
    "org.tariff": "R",
    // Charger permissions
    "charger.chargerStatus": "RW",
    "charger.enableDisableCharger": "RW",
    "charger.chargerControl": "-",
    "charger.notifications": "R",
    "charger.chargersLog": "R",
    "charger.schedule": "RW",
    // Users permissions
    "users.editUsers": "-",
    "users.editRFID": "-",
    // Finance permissions
    "finance.financialReports": "-",
    "finance.setShift": "R",
    "finance.shiftCollection": "-",
  },
  operator: {
    // Org permissions
    "org.logo": "R",
    "org.name": "R",
    "org.banner": "R",
    "org.tariff": "R",
    // Charger permissions
    "charger.chargerStatus": "RW",
    "charger.enableDisableCharger": "-",
    "charger.chargerControl": "RW",
    "charger.notifications": "R",
    "charger.chargersLog": "-",
    "charger.schedule": "-",
    // Users permissions
    "users.editUsers": "-",
    "users.editRFID": "-",
    // Finance permissions
    "finance.financialReports": "-",
    "finance.setShift": "-",
    "finance.shiftCollection": "RW",
  },
  accountant: {
    // Org permissions
    "org.logo": "R",
    "org.name": "R",
    "org.banner": "R",
    "org.tariff": "R",
    // Charger permissions
    "charger.chargerStatus": "-",
    "charger.enableDisableCharger": "-",
    "charger.chargerControl": "-",
    "charger.notifications": "-",
    "charger.chargersLog": "-",
    "charger.schedule": "-",
    // Users permissions
    "users.editUsers": "-",
    "users.editRFID": "R",
    // Finance permissions
    "finance.financialReports": "-",
    "finance.setShift": "R",
    "finance.shiftCollection": "-",
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parses a permission value string into read/write booleans
 */
function parsePermissionValue(value: PermissionValue): { read: boolean; write: boolean } {
  switch (value) {
    case "R":
      return { read: true, write: false };
    case "W":
      return { read: false, write: true };
    case "RW":
      return { read: true, write: true };
    case "-":
    default:
      return { read: false, write: false };
  }
}

/**
 * Gets the permission value for a role and permission key
 */
function getPermissionValue(
  role: Role,
  permission: PermissionKey
): PermissionValue {
  return RBAC_MATRIX[role]?.[permission] ?? "-";
}

/**
 * Checks if a role has read access to a permission
 * 
 * @param role - The role to check
 * @param permission - The permission key to check
 * @returns true if the role has read access
 */
export function hasRead(role: Role, permission: PermissionKey): boolean {
  const value = getPermissionValue(role, permission);
  return parsePermissionValue(value).read;
}

/**
 * Checks if a role has write access to a permission
 * 
 * @param role - The role to check
 * @param permission - The permission key to check
 * @returns true if the role has write access
 */
export function hasWrite(role: Role, permission: PermissionKey): boolean {
  const value = getPermissionValue(role, permission);
  return parsePermissionValue(value).write;
}

/**
 * Checks if a role has a specific action (read/write) for a permission
 * 
 * @param role - The role to check
 * @param permission - The permission key to check
 * @param action - The action to check (read or write)
 * @returns true if the role has the specified action
 */
export function hasPermission(
  role: Role,
  permission: PermissionKey,
  action: PermissionAction
): boolean {
  const value = getPermissionValue(role, permission);
  const parsed = parsePermissionValue(value);
  return action === "read" ? parsed.read : parsed.write;
}

/**
 * Gets the full permission object for a role and permission key
 * 
 * @param role - The role to check
 * @param permission - The permission key to check
 * @returns Permission object with read and write flags
 */
export function getPermission(
  role: Role,
  permission: PermissionKey
): Permission {
  const value = getPermissionValue(role, permission);
  const parsed = parsePermissionValue(value);
  return {
    key: permission,
    read: parsed.read,
    write: parsed.write,
  };
}

/**
 * Gets all permissions for a role
 * 
 * @param role - The role to get permissions for
 * @returns Record of all permissions for the role
 */
export function getRolePermissions(role: Role): Record<PermissionKey, Permission> {
  const permissions = {} as Record<PermissionKey, Permission>;
  const roleMatrix = RBAC_MATRIX[role];
  
  if (!roleMatrix) {
    return permissions;
  }

  (Object.keys(roleMatrix) as PermissionKey[]).forEach((key) => {
    permissions[key] = getPermission(role, key);
  });

  return permissions;
}

/**
 * Checks if a role has any of the specified permissions
 * 
 * @param role - The role to check
 * @param permissions - Array of permission keys to check
 * @param action - The action to check (read or write)
 * @returns true if the role has at least one of the permissions
 */
export function hasAnyPermission(
  role: Role,
  permissions: PermissionKey[],
  action: PermissionAction = "read"
): boolean {
  return permissions.some((permission) => hasPermission(role, permission, action));
}

/**
 * Checks if a role has all of the specified permissions
 * 
 * @param role - The role to check
 * @param permissions - Array of permission keys to check
 * @param action - The action to check (read or write)
 * @returns true if the role has all of the permissions
 */
export function hasAllPermissions(
  role: Role,
  permissions: PermissionKey[],
  action: PermissionAction = "read"
): boolean {
  return permissions.every((permission) => hasPermission(role, permission, action));
}

/**
 * Gets all permission keys that a role has access to
 * 
 * @param role - The role to check
 * @param action - Optional action filter (read or write)
 * @returns Array of permission keys the role has access to
 */
export function getAccessiblePermissions(
  role: Role,
  action?: PermissionAction
): PermissionKey[] {
  const roleMatrix = RBAC_MATRIX[role];
  if (!roleMatrix) {
    return [];
  }

  const permissions: PermissionKey[] = [];
  (Object.keys(roleMatrix) as PermissionKey[]).forEach((key) => {
    const value = roleMatrix[key];
    if (value === "-") return;

    if (!action) {
      permissions.push(key);
    } else {
      const parsed = parsePermissionValue(value);
      if (action === "read" && parsed.read) {
        permissions.push(key);
      } else if (action === "write" && parsed.write) {
        permissions.push(key);
      }
    }
  });

  return permissions;
}
