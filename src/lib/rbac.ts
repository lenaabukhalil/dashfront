/**
 * RBAC System - Main Export File
 * 
 * This file exports all RBAC-related functionality for easy importing
 */

// Types
export type {
  Role,
  PermissionAction,
  PermissionValue,
  OrgPermissionKey,
  ChargerPermissionKey,
  UsersPermissionKey,
  FinancePermissionKey,
  PermissionKey,
  Permission,
  RBACStructure,
} from "./permissions";

// Permission matrix
export { RBAC_MATRIX } from "./permissions";

// Utility functions
export {
  hasRead,
  hasWrite,
  hasPermission,
  getPermission,
  getRolePermissions,
  hasAnyPermission,
  hasAllPermissions,
  getAccessiblePermissions,
} from "./permissions";

// Helper functions
export {
  userTypeToRole,
  roleToUserType,
  getRoleDisplayName,
  getRoleDescription,
  isAdminRole,
  hasFinancialAccess,
  hasChargerControlAccess,
  getAllRoles,
} from "./rbac-helpers";

// React hook
export { usePermission } from "@/hooks/usePermission";
export type { UsePermissionReturn } from "@/hooks/usePermission";
