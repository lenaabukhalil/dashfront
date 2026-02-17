export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertType = 
  | "charger_offline"
  | "charger_fault"
  | "low_balance"
  | "payment_failure"
  | "maintenance_due"
  | "unusual_activity"
  | "revenue_threshold"
  | "session_completed"
  | "new_user"
  | "system_issue";

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  conditions: Record<string, unknown>;
  recipients: number[]; // User types that should receive this alert
  channels: ("in_app" | "email" | "sms")[];
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, unknown>;
}
