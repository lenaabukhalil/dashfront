export type UserType = 1 | 2 | 3; // 1=admin, 2=operator, 3=accountant

export type Permission = 
  | "dashboard.view"
  | "organizations.view"
  | "organizations.edit"
  | "organizations.delete"
  | "locations.view"
  | "locations.edit"
  | "locations.delete"
  | "chargers.view"
  | "chargers.edit"
  | "chargers.delete"
  | "chargers.command"
  | "connectors.view"
  | "connectors.edit"
  | "connectors.delete"
  | "tariffs.view"
  | "tariffs.edit"
  | "tariffs.delete"
  | "users.view"
  | "users.edit"
  | "users.delete"
  | "reports.view"
  | "reports.create"
  | "reports.export"
  | "reports.schedule"
  | "settings.view"
  | "settings.edit"
  | "financial.view"
  | "financial.edit";

export interface RolePermissions {
  [key: number]: Permission[];
}

export const ROLE_PERMISSIONS: RolePermissions = {
  // Admin: Full access
  1: [
    "dashboard.view",
    "organizations.view",
    "organizations.edit",
    "organizations.delete",
    "locations.view",
    "locations.edit",
    "locations.delete",
    "chargers.view",
    "chargers.edit",
    "chargers.delete",
    "chargers.command",
    "connectors.view",
    "connectors.edit",
    "connectors.delete",
    "tariffs.view",
    "tariffs.edit",
    "tariffs.delete",
    "users.view",
    "users.edit",
    "users.delete",
    "reports.view",
    "reports.create",
    "reports.export",
    "reports.schedule",
    "settings.view",
    "settings.edit",
    "financial.view",
    "financial.edit",
  ],
  // Operator: Operational access
  2: [
    "dashboard.view",
    "locations.view",
    "chargers.view",
    "chargers.command",
    "connectors.view",
    "reports.view",
    "reports.create",
    "reports.export",
  ],
  // Accountant: Financial access
  3: [
    "dashboard.view",
    "organizations.view",
    "reports.view",
    "reports.create",
    "reports.export",
    "reports.schedule",
    "users.view",
    "financial.view",
    "financial.edit",
  ],
};

export const NAV_ITEMS_PER_ROLE: Record<number, string[]> = {
  1: ["/dashboard", "/organizations", "/locations", "/chargers", "/connectors", "/tariffs", "/users", "/reports", "/settings"],
  2: ["/dashboard", "/locations", "/chargers", "/connectors", "/reports"],
  3: ["/dashboard", "/organizations", "/reports", "/users"],
};
