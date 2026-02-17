export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: string;
  team?: string;
  organization_id?: string;
  charger_id?: string;
  location_id?: string;
  connector_id?: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  attachments?: string[];
  auto_detected?: boolean;
  time_since_opened?: string;
}

export interface FirmwareVersion {
  charger_id: string;
  charger_name: string;
  current_version: string;
  latest_version: string;
  status: "up_to_date" | "update_available" | "updating" | "failed";
  last_updated?: string;
}

export interface SLAMetric {
  location_id: string;
  location_name: string;
  uptime_percentage: number;
  mttr_hours: number;
  response_time_minutes: number;
  status: "compliant" | "warning" | "breach";
  breaches_count: number;
}
