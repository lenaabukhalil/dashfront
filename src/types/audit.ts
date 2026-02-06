export type AuditActionType =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "command"
  | "permission_change"
  | "settings_change";

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userType: number;
  action: AuditActionType;
  resource: string; // e.g., "organization", "charger", "user"
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditActionType;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
}
