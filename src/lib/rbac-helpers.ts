
import type { Role } from "./permissions";
import type { UserType } from "@/types/auth";

export function userTypeToRole(userType: UserType): Role {
  const mapping: Record<UserType, Role> = {
    1: "admin",
    2: "manager",
    3: "engineer",
    4: "operator",
    5: "accountant",
    6: "viewer",
  };
  return mapping[userType] || "operator";
}

export function roleToUserType(role: Role): UserType {
  const mapping: Record<Role, UserType> = {
    admin: 1,
    manager: 2,
    engineer: 3,
    operator: 4,
    accountant: 5,
    viewer: 6,
  };
  return mapping[role] || 4;
}

export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    admin: "Owner",
    manager: "Manager",
    engineer: "Engineer",
    operator: "Operator",
    accountant: "Accountant",
    viewer: "Viewer",
  };
  return displayNames[role] || role;
}

export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    admin: "Full system access with all permissions",
    manager: "Management access with operational and user management permissions",
    engineer: "Technical access for charger management and maintenance",
    operator: "Operational access for daily charging operations",
    accountant: "Financial access for reports and accounting tasks",
    viewer: "Read-only access",
  };
  return descriptions[role] || "";
}

export function isAdminRole(role: Role): boolean {
  return role === "admin";
}

export function hasFinancialAccess(role: Role): boolean {
  return ["admin", "manager", "accountant"].includes(role);
}

export function hasChargerControlAccess(role: Role): boolean {
  return ["admin", "manager", "engineer", "operator"].includes(role);
}

export function getAllRoles(): Role[] {
  return ["admin", "manager", "engineer", "operator", "accountant", "viewer"];
}
