/**
 * JWT-backed permission map from POST /api/v4/auth/login and GET /api/v4/auth/me.
 * Kept separate from role-matrix helpers in `permissions.ts` to avoid naming clashes.
 */

export type AccessLevel = "R" | "RW";

export type Permissions = Record<string, AccessLevel>;

export const PERMISSION_CODES = {
  CHARGER_ENABLE: "charger.enable_disable",
  CHARGER_STATUS: "charger.status",
  ORG_NAME: "org.name",
  TARIFF: "tariff",
  USERS_EDIT: "users.edit",
  RFID_EDIT: "rfid.edit",
  TICKETS_MANAGE: "tickets.manage",
} as const;

export type EvsePermissionCode = (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

export function hasPermission(
  permissions: Permissions | null | undefined,
  code: string,
  required: AccessLevel = "R",
): boolean {
  if (!permissions || typeof permissions !== "object") return false;
  const access = permissions[code];
  if (!access) return false;
  if (required === "RW") return access === "RW";
  return access === "R" || access === "RW";
}

export const canRead = (p: Permissions | null | undefined, code: string) =>
  hasPermission(p, code, "R");

export const canWrite = (p: Permissions | null | undefined, code: string) =>
  hasPermission(p, code, "RW");

export const hasAnyPermission = (
  p: Permissions | null | undefined,
  codes: string[],
  required: AccessLevel = "R",
): boolean => codes.some((c) => hasPermission(p, c, required));
