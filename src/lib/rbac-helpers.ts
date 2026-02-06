/**
 * RBAC Helper Functions
 * 
 * Utility functions for converting between different role representations
 * and common permission checks
 */

import type { Role } from "./permissions";
import type { UserType } from "@/types/auth";

/**
 * Maps numeric UserType to Role string
 */
export function userTypeToRole(userType: UserType): Role {
  const mapping: Record<UserType, Role> = {
    1: "admin",
    2: "manager",
    3: "engineer",
    4: "operator",
    5: "accountant",
  };
  return mapping[userType] || "operator";
}

/**
 * Maps Role string to numeric UserType
 */
export function roleToUserType(role: Role): UserType {
  const mapping: Record<Role, UserType> = {
    admin: 1,
    manager: 2,
    engineer: 3,
    operator: 4,
    accountant: 5,
  };
  return mapping[role] || 4;
}

/**
 * Gets role name in a human-readable format
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    admin: "Administrator",
    manager: "Manager",
    engineer: "Engineer",
    operator: "Operator",
    accountant: "Accountant",
  };
  return displayNames[role] || role;
}

/**
 * Gets role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    admin: "Full system access with all permissions",
    manager: "Management access with operational and user management permissions",
    engineer: "Technical access for charger management and maintenance",
    operator: "Operational access for daily charging operations",
    accountant: "Financial access for reports and accounting tasks",
  };
  return descriptions[role] || "";
}

/**
 * Checks if a role is an administrative role
 */
export function isAdminRole(role: Role): boolean {
  return role === "admin";
}

/**
 * Checks if a role has financial access
 */
export function hasFinancialAccess(role: Role): boolean {
  return ["admin", "manager", "accountant"].includes(role);
}

/**
 * Checks if a role has charger control access
 */
export function hasChargerControlAccess(role: Role): boolean {
  return ["admin", "manager", "engineer", "operator"].includes(role);
}

/**
 * Gets all available roles
 */
export function getAllRoles(): Role[] {
  return ["admin", "manager", "engineer", "operator", "accountant"];
}
