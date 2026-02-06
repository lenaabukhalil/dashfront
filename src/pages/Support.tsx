import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Wrench,
  Shield,
  Plus,
  Calendar,
  Upload,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { fetchChargerOrganizations, fetchLocationsByOrg, fetchChargersByLocation } from "@/services/api";
import type { SelectOption } from "@/types";

const tabs = [
  { id: "tickets", label: "Maintenance Tickets" },
  { id: "preventive", label: "Preventive Maintenance" },
];

// Ticket severity levels
const priorityOptions = [
  { value: "low", label: "Low", color: "bg-gray-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-500" },
];

// Ticket lifecycle states
const ticketStatusOptions = [
  { value: "new", label: "New" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_parts", label: "Waiting for Parts" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

// Maintenance schedule types
const scheduleTypes = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

// Firmware rollout modes
const rolloutModes = [
  { value: "immediate", label: "Immediate" },
  { value: "scheduled", label: "Scheduled (Off-Peak)" },
];

interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: string;
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

interface PreventiveMaintenance {
  id: string;
  charger_id: string;
  charger_name: string;
  schedule_type: string;
  last_maintenance: string;
  next_maintenance: string;
  status: "scheduled" | "completed" | "overdue";
  checklist_completed: number;
  checklist_total: number;
}

interface FirmwareVersion {
  charger_id: string;
  charger_name: string;
  current_version: string;
  latest_version: string;
  status: "up_to_date" | "update_available" | "updating" | "failed";
  last_updated?: string;
}

interface SLAMetric {
  location_id: string;
  location_name: string;
  uptime_percentage: number;
  mttr_hours: number;
  response_time_minutes: number;
  status: "compliant" | "warning" | "breach";
  breaches_count: number;
}

const Support = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  const [activeTab, setActiveTab] = useState("tickets");

  // Tickets state
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    organization_id: "",
    location_id: "",
    charger_id: "",
    connector_id: "",
    auto_detect: false,
  });
  const [attachments, setAttachments] = useState<File[]>([]);

  // Preventive maintenance state
  const [preventiveMaintenance, setPreventiveMaintenance] = useState<PreventiveMaintenance[]>([]);
  const [selectedScheduleType, setSelectedScheduleType] = useState("monthly");
  const [isMaintenancePlanDialogOpen, setIsMaintenancePlanDialogOpen] = useState(false);
  const [maintenancePlanForm, setMaintenancePlanForm] = useState({
    charger_id: "",
    schedule_type: "monthly",
    next_maintenance: "",
    auto_generate: true,
  });

  // Firmware state
  const [firmwareVersions, setFirmwareVersions] = useState<FirmwareVersion[]>([]);
  const [selectedChargers, setSelectedChargers] = useState<string[]>([]);
  const [rolloutMode, setRolloutMode] = useState("immediate");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);

  // SLA state
  const [slaMetrics, setSlaMetrics] = useState<SLAMetric[]>([]);
  const [slaThresholds, setSlaThresholds] = useState({
    uptime_warning: "",
    uptime_breach: "",
    mttr_warning: "",
    mttr_breach: 8,
    response_warning: 30,
    response_breach: 60,
  });

  // Dropdown options
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    // Load organizations for dropdowns
    const loadOrgs = async () => {
      try {
        const orgs = await fetchChargerOrganizations();
        setOrgOptions(orgs);
      } catch (error) {
        console.error("Error loading organizations:", error);
      }
    };
    loadOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      const loadLocations = async () => {
        try {
          const locations = await fetchLocationsByOrg(selectedOrg);
          setLocationOptions(locations);
        } catch (error) {
          console.error("Error loading locations:", error);
        }
      };
      loadLocations();
    } else {
      setLocationOptions([]);
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (ticketForm.location_id) {
      const loadChargers = async () => {
        try {
          const chargers = await fetchChargersByLocation(ticketForm.location_id);
          setChargerOptions(chargers);
        } catch (error) {
          console.error("Error loading chargers:", error);
        }
      };
      loadChargers();
    } else {
      setChargerOptions([]);
    }
  }, [ticketForm.location_id]);

  // Load firmware versions when charger options are available
  useEffect(() => {
    if (chargerOptions.length > 0 && firmwareVersions.length === 0) {
      // Generate mock firmware data
      const mockFirmware: FirmwareVersion[] = chargerOptions.slice(0, 5).map((charger, index) => ({
        charger_id: charger.value,
        charger_name: charger.label,
        current_version: `v1.${Math.floor(Math.random() * 5) + 2}.${Math.floor(Math.random() * 10)}`,
        latest_version: `v1.${Math.floor(Math.random() * 5) + 3}.${Math.floor(Math.random() * 10)}`,
        status: index % 3 === 0 ? "up_to_date" : "update_available",
        last_updated: index % 2 === 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      }));
      setFirmwareVersions(mockFirmware);
    }
  }, [chargerOptions, firmwareVersions.length]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // API call would go here
      const newTicket: MaintenanceTicket = {
        id: `TKT-${Date.now()}`,
        title: ticketForm.title,
        description: ticketForm.description,
        priority: ticketForm.priority as any,
        status: "new",
        charger_id: ticketForm.charger_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        auto_detected: ticketForm.auto_detect,
        time_since_opened: "Just now",
      };
      setTickets([newTicket, ...tickets]);
      toast({
        title: "Ticket created",
        description: "Maintenance ticket has been created successfully.",
      });
      setIsTicketDialogOpen(false);
      setTicketForm({
        title: "",
        description: "",
        priority: "medium",
        organization_id: "",
        location_id: "",
        charger_id: "",
        connector_id: "",
        auto_detect: false,
      });
      setSelectedOrg("");
      setLocationOptions([]);
      setChargerOptions([]);
      setAttachments([]);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket.",
        variant: "destructive",
      });
    }
  };

  const handleCreateMaintenancePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!maintenancePlanForm.charger_id) {
        toast({
          title: "Error",
          description: "Please select a charger.",
          variant: "destructive",
        });
        return;
      }

      // Calculate next maintenance date based on schedule type
      const nextDate = new Date();
      if (maintenancePlanForm.schedule_type === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (maintenancePlanForm.schedule_type === "quarterly") {
        nextDate.setMonth(nextDate.getMonth() + 3);
      } else if (maintenancePlanForm.schedule_type === "annual") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      const selectedCharger = chargerOptions.find((c) => c.value === maintenancePlanForm.charger_id);
      
      const newPlan: PreventiveMaintenance = {
        id: `PLAN-${Date.now()}`,
        charger_id: maintenancePlanForm.charger_id,
        charger_name: selectedCharger?.label || "Unknown Charger",
        schedule_type: maintenancePlanForm.schedule_type,
        last_maintenance: new Date().toISOString(),
        next_maintenance: nextDate.toISOString(),
        status: "scheduled",
        checklist_completed: 0,
        checklist_total: 5,
      };

      setPreventiveMaintenance([newPlan, ...preventiveMaintenance]);
      toast({
        title: "Maintenance plan created",
        description: "Preventive maintenance plan has been created successfully.",
      });
      setIsMaintenancePlanDialogOpen(false);
      setMaintenancePlanForm({
        charger_id: "",
        schedule_type: "monthly",
        next_maintenance: "",
        auto_generate: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create maintenance plan.",
        variant: "destructive",
      });
    }
  };

  const handleUpgradeFirmware = async () => {
    if (selectedChargers.length === 0) {
      toast({
        title: "No chargers selected",
        description: "Please select at least one charger to upgrade.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpgrading(true);
      
      // Validate scheduled time if scheduled mode
      if (rolloutMode === "scheduled" && !scheduledTime) {
        toast({
          title: "Scheduled time required",
          description: "Please select a scheduled time for the upgrade.",
          variant: "destructive",
        });
        setIsUpgrading(false);
        return;
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update firmware versions status
      setFirmwareVersions((prev) =>
        prev.map((fw) =>
          selectedChargers.includes(fw.charger_id)
            ? {
                ...fw,
                status: "updating" as const,
                last_updated: new Date().toISOString(),
              }
            : fw
        )
      );

      toast({
        title: "Firmware upgrade initiated",
        description: `Upgrading firmware for ${selectedChargers.length} charger(s). ${rolloutMode === "scheduled" ? `Scheduled for ${new Date(scheduledTime).toLocaleString()}` : "Upgrade in progress..."}`,
      });

      // Simulate upgrade completion after delay
      setTimeout(() => {
        setFirmwareVersions((prev) =>
          prev.map((fw) =>
            selectedChargers.includes(fw.charger_id)
              ? {
                  ...fw,
                  status: "up_to_date" as const,
                  current_version: fw.latest_version,
                  last_updated: new Date().toISOString(),
                }
              : fw
          )
        );
        setSelectedChargers([]);
        toast({
          title: "Firmware upgrade completed",
          description: "All selected chargers have been upgraded successfully.",
        });
      }, 3000);
    } catch (error) {
      toast({
        title: "Upgrade failed",
        description: error instanceof Error ? error.message : "Failed to upgrade firmware.",
        variant: "destructive",
      });
      // Mark as failed
      setFirmwareVersions((prev) =>
        prev.map((fw) =>
          selectedChargers.includes(fw.charger_id)
            ? { ...fw, status: "failed" as const }
            : fw
        )
      );
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast({
        title: "Too many files",
        description: "Maximum 5 attachments allowed.",
        variant: "destructive",
      });
      return;
    }
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getPriorityColor = (priority: string) => {
    const option = priorityOptions.find((p) => p.value === priority);
    return option?.color || "bg-gray-500";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      new: "outline",
      assigned: "secondary",
      in_progress: "default",
      waiting_parts: "secondary",
      resolved: "default",
      closed: "outline",
    };
    return variants[status] || "outline";
  };

  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "breach":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Support & Maintenance</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage maintenance tickets, preventive schedules, firmware upgrades, and SLA compliance
          </p>
          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Maintenance Tickets Tab */}
        {activeTab === "tickets" && (
          <PermissionGuard
            role={role}
            permission="charger.chargerStatus"
            action="read"
            fallback={
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to view maintenance tickets."
                  />
                </CardContent>
              </Card>
            }
          >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Maintenance Tickets
                  </CardTitle>
                  <CardDescription>
                      Create and manage charger maintenance issues with severity levels and lifecycle tracking
                  </CardDescription>
                </div>
                  <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                        Create Maintenance Ticket
                    </Button>
                  </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Maintenance Ticket</DialogTitle>
                      <DialogDescription>
                          Report an issue or request maintenance for a charger. Auto-detection from faults is supported.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTicket} className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="auto-detect"
                            checked={ticketForm.auto_detect}
                            onCheckedChange={(checked) =>
                              setTicketForm({ ...ticketForm, auto_detect: checked })
                            }
                          />
                          <Label htmlFor="auto-detect" className="text-sm">
                            Auto-detect from charger fault
                          </Label>
                        </div>

                      <div className="space-y-2">
                        <Label htmlFor="ticket-title">
                          Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="ticket-title"
                          value={ticketForm.title}
                          onChange={(e) =>
                            setTicketForm({ ...ticketForm, title: e.target.value })
                          }
                            placeholder="e.g., Charger connector not responding"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ticket-description">
                          Description <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="ticket-description"
                          value={ticketForm.description}
                          onChange={(e) =>
                            setTicketForm({ ...ticketForm, description: e.target.value })
                          }
                            placeholder="Describe the issue in detail..."
                          required
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ticket-priority">Priority</Label>
                          <Select
                            value={ticketForm.priority}
                            onValueChange={(val) =>
                              setTicketForm({ ...ticketForm, priority: val })
                            }
                          >
                            <SelectTrigger id="ticket-priority">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                                      {opt.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ticket-org">Organization</Label>
                            <Select
                              value={selectedOrg}
                              onValueChange={(val) => {
                                setSelectedOrg(val);
                                setTicketForm({ ...ticketForm, organization_id: val, location_id: "", charger_id: "" });
                              }}
                            >
                              <SelectTrigger id="ticket-org">
                                <SelectValue placeholder="Select organization" />
                              </SelectTrigger>
                              <SelectContent>
                                {orgOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ticket-location">Location</Label>
                            <Select
                              value={ticketForm.location_id}
                              onValueChange={(val) =>
                                setTicketForm({ ...ticketForm, location_id: val, charger_id: "" })
                              }
                              disabled={!selectedOrg}
                            >
                              <SelectTrigger id="ticket-location">
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                              <SelectContent>
                                {locationOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ticket-charger">Charger</Label>
                            <Select
                              value={ticketForm.charger_id}
                              onValueChange={(val) =>
                                setTicketForm({ ...ticketForm, charger_id: val })
                              }
                              disabled={!ticketForm.location_id}
                            >
                              <SelectTrigger id="ticket-charger">
                                <SelectValue placeholder="Select charger" />
                              </SelectTrigger>
                              <SelectContent>
                                {chargerOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="ticket-connector">Connector (Optional)</Label>
                          <Input
                              id="ticket-connector"
                              value={ticketForm.connector_id}
                            onChange={(e) =>
                                setTicketForm({ ...ticketForm, connector_id: e.target.value })
                            }
                              placeholder="Connector ID"
                          />
                          </div>
                        </div>


                        <div className="space-y-2">
                          <Label htmlFor="attachments">Attachments</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="attachments"
                              type="file"
                              multiple
                              accept="image/*,.pdf,.log,.txt"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <Label
                              htmlFor="attachments"
                              className="cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted"
                            >
                              <Upload className="w-4 h-4" />
                              Upload Files
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              Logs, photos, firmware snapshots (max 5 files)
                            </span>
                          </div>
                          {attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {attachments.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                                >
                                  <span className="truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAttachment(index)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                            onClick={() => setIsTicketDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Create Ticket</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <EmptyState
                    title="No Maintenance Tickets"
                    description="Create your first maintenance ticket to track charger issues and repairs. Tickets can be auto-detected from charger faults or created manually."
                    action={
                      <Button onClick={() => setIsTicketDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Maintenance Ticket
                      </Button>
                    }
                />
              ) : (
                  <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                          <TableHead>Charger</TableHead>
                          <TableHead>Time Since Opened</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">{ticket.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {ticket.title}
                                {ticket.auto_detected && (
                                  <Badge variant="outline" className="text-xs">
                                    Auto
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                        <TableCell>
                          <Badge
                                className={`${getPriorityColor(ticket.priority)} text-white`}
                          >
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                              <Badge variant={getStatusBadge(ticket.status)}>
                                {ticketStatusOptions.find((s) => s.value === ticket.status)?.label ||
                                  ticket.status}
                              </Badge>
                        </TableCell>
                            <TableCell>{ticket.charger_id || "N/A"}</TableCell>
                        <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {formatTimeAgo(ticket.created_at)}
                              </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  </div>
              )}
            </CardContent>
          </Card>
          </PermissionGuard>
        )}

        {/* Preventive Maintenance Tab */}
        {activeTab === "preventive" && (
          <PermissionGuard
            role={role}
            permission="charger.chargerStatus"
            action="read"
            fallback={
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to view preventive maintenance."
                  />
                </CardContent>
              </Card>
            }
          >
            <div className="space-y-6">
          <Card>
            <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Preventive/Periodic Maintenance
              </CardTitle>
              <CardDescription>
                        Schedule and track periodic maintenance activities to reduce failures before they happen
                      </CardDescription>
                    </div>
                    <Dialog open={isMaintenancePlanDialogOpen} onOpenChange={setIsMaintenancePlanDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Maintenance Plan
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Maintenance Plan</DialogTitle>
                          <DialogDescription>
                            Schedule periodic maintenance for a charger to reduce failures before they happen.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateMaintenancePlan} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="plan-org">Organization</Label>
                            <Select
                              value={selectedOrg}
                              onValueChange={(val) => {
                                setSelectedOrg(val);
                                setMaintenancePlanForm({ ...maintenancePlanForm, charger_id: "" });
                              }}
                            >
                              <SelectTrigger id="plan-org">
                                <SelectValue placeholder="Select organization" />
                              </SelectTrigger>
                              <SelectContent>
                                {orgOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="plan-location">Location</Label>
                            <Select
                              value={ticketForm.location_id}
                              onValueChange={(val) => {
                                setTicketForm({ ...ticketForm, location_id: val });
                                setMaintenancePlanForm({ ...maintenancePlanForm, charger_id: "" });
                              }}
                              disabled={!selectedOrg}
                            >
                              <SelectTrigger id="plan-location">
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                              <SelectContent>
                                {locationOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="plan-charger">
                              Charger <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={maintenancePlanForm.charger_id}
                              onValueChange={(val) =>
                                setMaintenancePlanForm({ ...maintenancePlanForm, charger_id: val })
                              }
                              disabled={!ticketForm.location_id}
                            >
                              <SelectTrigger id="plan-charger">
                                <SelectValue placeholder="Select charger" />
                              </SelectTrigger>
                              <SelectContent>
                                {chargerOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="plan-schedule">
                              Schedule Type <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={maintenancePlanForm.schedule_type}
                              onValueChange={(val) =>
                                setMaintenancePlanForm({ ...maintenancePlanForm, schedule_type: val })
                              }
                            >
                              <SelectTrigger id="plan-schedule">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {scheduleTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="plan-auto-generate"
                              checked={maintenancePlanForm.auto_generate}
                              onCheckedChange={(checked) =>
                                setMaintenancePlanForm({ ...maintenancePlanForm, auto_generate: checked })
                              }
                            />
                            <Label htmlFor="plan-auto-generate" className="text-sm">
                              Auto-generate tickets when due
                            </Label>
                          </div>

                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsMaintenancePlanDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit">Create Plan</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label>Schedule Type:</Label>
                      <Select value={selectedScheduleType} onValueChange={setSelectedScheduleType}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {scheduleTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Switch id="auto-generate" defaultChecked />
                      <Label htmlFor="auto-generate" className="text-sm">
                        Auto-generate tickets when due
                      </Label>
                    </div>

                    {preventiveMaintenance.length === 0 ? (
                      <EmptyState
                        title="No Maintenance Plans"
                        description="Create maintenance plans to schedule periodic inspections and reduce charger failures. Plans can be monthly, quarterly, or annual."
                        action={
                          <Button onClick={() => setIsMaintenancePlanDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Maintenance Plan
                          </Button>
                        }
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Charger</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Last Maintenance</TableHead>
                            <TableHead>Next Maintenance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Checklist</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preventiveMaintenance.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.charger_name}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.schedule_type}</Badge>
                              </TableCell>
                              <TableCell>{new Date(item.last_maintenance).toLocaleDateString()}</TableCell>
                              <TableCell>{new Date(item.next_maintenance).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    item.status === "overdue"
                                      ? "destructive"
                                      : item.status === "completed"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {item.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={
                                      (item.checklist_completed / item.checklist_total) * 100
                                    }
                                    className="w-24"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {item.checklist_completed}/{item.checklist_total}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Checklist</CardTitle>
                  <CardDescription>
                    Standard checklist items per charger type
              </CardDescription>
            </CardHeader>
            <CardContent>
                  <div className="space-y-2">
                    {["Cable inspection", "Connector cleaning", "Cooling system check", "Firmware version check", "Power output test"].map(
                      (item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input type="checkbox" id={`check-${index}`} className="rounded" />
                          <Label htmlFor={`check-${index}`} className="text-sm">
                            {item}
                          </Label>
                        </div>
                      )
                    )}
                  </div>
            </CardContent>
          </Card>
            </div>
          </PermissionGuard>
        )}

        {/* Firmware Upgrade Tab */}
        {false && (
          <PermissionGuard
            role={role}
            permission="charger.chargerControl"
            action="read"
            fallback={
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to manage firmware upgrades."
                  />
                </CardContent>
              </Card>
            }
          >
            <div className="space-y-6">
          <Card>
            <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Firmware Upgrade
              </CardTitle>
              <CardDescription>
                        Safely manage charger firmware updates with version tracking and rollback support
              </CardDescription>
                    </div>
                    <Button 
                      disabled={selectedChargers.length === 0 || isUpgrading}
                      onClick={handleUpgradeFirmware}
                    >
                      {isUpgrading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Upgrading...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Upgrade Selected ({selectedChargers.length})
                        </>
                      )}
                    </Button>
                  </div>
            </CardHeader>
            <CardContent>
                  {firmwareVersions.length === 0 ? (
              <EmptyState
                      title="No Firmware Data"
                      description="Firmware version information will be displayed here. Select chargers to upgrade firmware safely."
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <Label>Rollout Mode:</Label>
                        <Select value={rolloutMode} onValueChange={setRolloutMode}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {rolloutModes.map((mode) => (
                              <SelectItem key={mode.value} value={mode.value}>
                                {mode.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {rolloutMode === "scheduled" && (
                          <Input
                            type="datetime-local"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-64"
                          />
                        )}
                        <Switch id="safety-check" defaultChecked />
                        <Label htmlFor="safety-check" className="text-sm">
                          Prevent during active sessions
                        </Label>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedChargers(
                                      firmwareVersions.map((v) => v.charger_id)
                                    );
                                  } else {
                                    setSelectedChargers([]);
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead>Charger</TableHead>
                            <TableHead>Current Version</TableHead>
                            <TableHead>Latest Version</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {firmwareVersions.map((fw) => (
                            <TableRow key={fw.charger_id}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={selectedChargers.includes(fw.charger_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedChargers([...selectedChargers, fw.charger_id]);
                                    } else {
                                      setSelectedChargers(
                                        selectedChargers.filter((id) => id !== fw.charger_id)
                                      );
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{fw.charger_name}</TableCell>
                              <TableCell className="font-mono text-sm">{fw.current_version}</TableCell>
                              <TableCell className="font-mono text-sm">{fw.latest_version}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    fw.status === "up_to_date"
                                      ? "default"
                                      : fw.status === "update_available"
                                      ? "secondary"
                                      : fw.status === "updating"
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {fw.status === "up_to_date" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {fw.status === "update_available" && (
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                  )}
                                  {fw.status === "updating" && (
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  )}
                                  {fw.status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
                                  {fw.status.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {fw.last_updated
                                  ? new Date(fw.last_updated).toLocaleDateString()
                                  : "Never"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {fw.status === "failed" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          // Simulate rollback
                                          await new Promise((resolve) => setTimeout(resolve, 1000));
                                          setFirmwareVersions((prev) =>
                                            prev.map((f) =>
                                              f.charger_id === fw.charger_id
                                                ? {
                                                    ...f,
                                                    status: "up_to_date" as const,
                                                    current_version: f.current_version,
                                                  }
                                                : f
                                            )
                                          );
                                          toast({
                                            title: "Rollback successful",
                                            description: "Firmware has been rolled back to previous version.",
                                          });
                                        } catch (error) {
                                          toast({
                                            title: "Rollback failed",
                                            description: "Failed to rollback firmware.",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                    >
                                      <RefreshCw className="w-4 h-4 mr-1" />
                                      Rollback
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm">
                                    View
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
            </CardContent>
          </Card>
            </div>
          </PermissionGuard>
        )}

        {/* SLA Management Tab */}
        {false && (
          <PermissionGuard
            role={role}
            permission="finance.financialReports"
            action="read"
            fallback={
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to view SLA metrics."
                  />
                </CardContent>
              </Card>
            }
          >
            <div className="space-y-6">
          <Card>
            <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                SLA Management
              </CardTitle>
              <CardDescription>
                        Track service performance and contractual compliance with uptime, MTTR, and response time metrics
              </CardDescription>
                    </div>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
            </CardHeader>
            <CardContent>
                  <div className="space-y-6">
                    {/* SLA Thresholds */}
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-4">SLA Thresholds</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Uptime Warning (%)</Label>
                          <Input
                            type="number"
                            value={slaThresholds.uptime_warning}
                            placeholder="Enter percentage"
                            onChange={(e) =>
                              setSlaThresholds({
                                ...slaThresholds,
                                uptime_warning: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Uptime Breach (%)</Label>
                          <Input
                            type="number"
                            value={slaThresholds.uptime_breach}
                            placeholder="Enter percentage"
                            onChange={(e) =>
                              setSlaThresholds({
                                ...slaThresholds,
                                uptime_breach: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>MTTR Warning (hours)</Label>
                          <Input
                            type="number"
                            value={slaThresholds.mttr_warning}
                            placeholder="Enter hours"
                            onChange={(e) =>
                              setSlaThresholds({
                                ...slaThresholds,
                                mttr_warning: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {slaMetrics.length === 0 ? (
              <EmptyState
                        title="No SLA Data"
                        description="SLA compliance metrics will be displayed here. Track uptime percentage, Mean Time to Repair (MTTR), and response times per location."
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Location</TableHead>
                            <TableHead>Uptime %</TableHead>
                            <TableHead>MTTR (hours)</TableHead>
                            <TableHead>Response Time (min)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Breaches</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slaMetrics.map((sla) => (
                            <TableRow key={sla.location_id}>
                              <TableCell className="font-medium">{sla.location_name}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={sla.uptime_percentage} className="w-24" />
                                  <span className="text-sm font-medium">
                                    {sla.uptime_percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{sla.mttr_hours.toFixed(1)}h</TableCell>
                              <TableCell>{sla.response_time_minutes}min</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    sla.status === "breach"
                                      ? "destructive"
                                      : sla.status === "warning"
                                      ? "default"
                                      : "outline"
                                  }
                                  className={getSLAStatusColor(sla.status)}
                                >
                                  {sla.status === "compliant" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {sla.status === "warning" && (
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                  )}
                                  {sla.status === "breach" && <XCircle className="w-3 h-3 mr-1" />}
                                  {sla.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {sla.breaches_count > 0 ? (
                                  <Badge variant="destructive">{sla.breaches_count}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">View Details</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
            </CardContent>
          </Card>
            </div>
          </PermissionGuard>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Support;
