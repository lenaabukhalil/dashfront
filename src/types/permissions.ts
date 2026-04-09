export const ALL_PERMISSION_CODES = [
  "org.logo",
  "org.name",
  "org.banner",
  "tariff",
  "charger.status",
  "charger.enable_disable",
  "charger.control",
  "notifications",
  "chargers.log",
  "schedule",
  "users.edit",
  "rfid.edit",
  "finance.reports",
  "shift.set",
  "shift.collection",
] as const;

export type PermissionCode = (typeof ALL_PERMISSION_CODES)[number];

export type PermissionsMap = Partial<Record<PermissionCode, "R" | "RW">>;

export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  "org.logo": "Organization Logo",
  "org.name": "Organization Name",
  "org.banner": "Organization Banner",
  tariff: "Tariff Management",
  "charger.status": "Charger Status",
  "charger.enable_disable": "Enable / Disable Charger",
  "charger.control": "Charger Remote Control",
  notifications: "Notifications",
  "chargers.log": "Charger Logs",
  schedule: "Scheduling",
  "users.edit": "User Management",
  "rfid.edit": "RFID Management",
  "finance.reports": "Financial Reports",
  "shift.set": "Shift Settings",
  "shift.collection": "Shift Collection",
};
