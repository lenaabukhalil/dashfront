
export type PermissionCode =
  | "org.logo"
  | "org.name"
  | "org.banner"
  | "tariff"
  | "charger.status"
  | "charger.enable_disable"
  | "charger.control"
  | "notifications"
  | "chargers.log"
  | "schedule"
  | "users.edit"
  | "rfid.edit"
  | "finance.reports"
  | "shift.set"
  | "shift.collection";

export type PermissionsMap = Partial<Record<PermissionCode, "R" | "RW">>;

export function toPermissionsMap(
  permissions:
    | PermissionsMap
    | string[]
    | { code: string; access: string }[]
    | undefined
): PermissionsMap {
  if (!permissions) return {};
  if (Array.isArray(permissions)) {
    const map: PermissionsMap = {};
    for (const item of permissions) {
      if (typeof item === "string") {
        map[item as PermissionCode] = "RW";
      } else if (item && typeof item === "object" && "code" in item && "access" in item) {
        const a = String((item as { access: string }).access).toUpperCase();
        if (a === "R" || a === "RW") map[(item as { code: string }).code as PermissionCode] = a as "R" | "RW";
      }
    }
    return map;
  }
  if (typeof permissions === "object" && !Array.isArray(permissions)) {
    const map: PermissionsMap = {};
    for (const [code, access] of Object.entries(permissions)) {
      const a = String(access).toUpperCase();
      if (a === "R" || a === "RW") map[code as PermissionCode] = a as "R" | "RW";
    }
    return map;
  }
  return {};
}

export const ALL_PERMISSION_CODES: PermissionCode[] = [
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
];

export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  "org.logo": "Organization Logo",
  "org.name": "Organization Name",
  "org.banner": "Organization Banner",
  tariff: "Tariff",
  "charger.status": "Charger Status",
  "charger.enable_disable": "Charger Enable/Disable",
  "charger.control": "Charger Control",
  notifications: "Notifications",
  "chargers.log": "Chargers Log",
  schedule: "Schedule",
  "users.edit": "Edit Users",
  "rfid.edit": "Edit RFID",
  "finance.reports": "Financial Reports",
  "shift.set": "Set Shift",
  "shift.collection": "Shift Collection",
};
