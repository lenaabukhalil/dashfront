import { useEffect, useState } from "react";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  createMaintenanceTicket as createMaintenanceTicketApi,
  fetchMaintenanceTickets,
  updateMaintenanceTicket as updateMaintenanceTicketApi,
  deleteMaintenanceTicket as deleteMaintenanceTicketApi,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";
import type { MaintenanceTicket, FirmwareVersion, SLAMetric } from "../types";

const initialTicketForm = {
  title: "",
  description: "",
  priority: "medium",
  team: "technical" as "technical" | "financial",
  organization_id: "",
  location_id: "",
  charger_id: "",
  connector_id: "",
  auto_detect: false,
  status: "new" as string,
};

export function useSupportData() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketToEdit, setTicketToEdit] = useState<MaintenanceTicket | null>(null);
  const [ticketForm, setTicketForm] = useState(initialTicketForm);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [firmwareVersions, setFirmwareVersions] = useState<FirmwareVersion[]>([]);
  const [selectedChargers, setSelectedChargers] = useState<string[]>([]);
  const [rolloutMode, setRolloutMode] = useState("immediate");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);

  const [slaMetrics, setSlaMetrics] = useState<SLAMetric[]>([]);
  const [slaThresholds, setSlaThresholds] = useState({
    uptime_warning: "",
    uptime_breach: "",
    mttr_warning: "",
    mttr_breach: 8,
    response_warning: 30,
    response_breach: 60,
  });

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
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
    const loadTickets = async () => {
      try {
        const list = await fetchMaintenanceTickets();
        setTickets(
          list.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            priority: row.priority as MaintenanceTicket["priority"],
            status: row.status,
            team: row.team,
            organization_id: row.organization_id,
            charger_id: row.charger_id,
            location_id: row.location_id,
            connector_id: row.connector_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            auto_detected: row.auto_detected,
            time_since_opened: "Just now",
          }))
        );
      } catch (error) {
        console.error("Error loading maintenance tickets:", error);
      }
    };
    loadTickets();
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

  useEffect(() => {
    if (chargerOptions.length > 0 && firmwareVersions.length === 0) {
      const mockFirmware: FirmwareVersion[] = chargerOptions.slice(0, 5).map((charger, index) => ({
        charger_id: charger.value,
        charger_name: charger.label,
        current_version: `v1.${Math.floor(Math.random() * 5) + 2}.${Math.floor(Math.random() * 10)}`,
        latest_version: `v1.${Math.floor(Math.random() * 5) + 3}.${Math.floor(Math.random() * 10)}`,
        status: index % 3 === 0 ? "up_to_date" : "update_available",
        last_updated:
          index % 2 === 0
            ? new Date(
                Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
              ).toISOString()
            : undefined,
      }));
      setFirmwareVersions(mockFirmware);
    }
  }, [chargerOptions, firmwareVersions.length]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const row = await createMaintenanceTicketApi({
        title: ticketForm.title,
        description: ticketForm.description,
        priority: ticketForm.priority,
        team: ticketForm.team,
        organization_id: ticketForm.organization_id || undefined,
        location_id: ticketForm.location_id || undefined,
        charger_id: ticketForm.charger_id || undefined,
        connector_id: ticketForm.connector_id || undefined,
        auto_detect: ticketForm.auto_detect,
      });
      const newTicket: MaintenanceTicket = {
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority as MaintenanceTicket["priority"],
        status: row.status,
        charger_id: row.charger_id,
        location_id: row.location_id,
        connector_id: row.connector_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        auto_detected: row.auto_detected,
        time_since_opened: "Just now",
      };
      setTickets([newTicket, ...tickets]);
      toast({
        title: "Ticket created",
        description: "Maintenance ticket has been created and the team has been notified.",
      });
      setIsTicketDialogOpen(false);
      setTicketForm({ ...initialTicketForm });
      setSelectedOrg("");
      setLocationOptions([]);
      setChargerOptions([]);
      setAttachments([]);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create ticket.",
        variant: "destructive",
      });
    }
  };

  const openEditTicket = (ticket: MaintenanceTicket) => {
    setTicketToEdit(ticket);
    setSelectedOrg(ticket.organization_id ?? "");
    setTicketForm({
      ...initialTicketForm,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      team: ticket.team === "financial" ? "financial" : "technical",
      organization_id: ticket.organization_id ?? "",
      location_id: ticket.location_id ?? "",
      charger_id: ticket.charger_id ?? "",
      connector_id: ticket.connector_id ?? "",
      auto_detect: ticket.auto_detected ?? false,
      status: ticket.status,
    });
    setIsTicketDialogOpen(true);
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToEdit) return;
    try {
      const row = await updateMaintenanceTicketApi(ticketToEdit.id, {
        title: ticketForm.title,
        description: ticketForm.description,
        priority: ticketForm.priority,
        status: ticketForm.status,
        team: ticketForm.team,
        organization_id: ticketForm.organization_id || null,
        location_id: ticketForm.location_id || null,
        charger_id: ticketForm.charger_id || null,
        connector_id: ticketForm.connector_id || null,
      });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketToEdit.id
            ? {
                ...t,
                title: row.title,
                description: row.description,
                priority: row.priority as MaintenanceTicket["priority"],
                status: row.status,
                charger_id: row.charger_id,
                location_id: row.location_id,
                connector_id: row.connector_id,
                updated_at: row.updated_at,
              }
            : t
        )
      );
      toast({ title: "Ticket updated", description: "Maintenance ticket has been updated." });
      setIsTicketDialogOpen(false);
      setTicketToEdit(null);
      setTicketForm(initialTicketForm);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update ticket.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTicket = async (id: string) => {
    try {
      await deleteMaintenanceTicketApi(id);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Ticket deleted", description: "Maintenance ticket has been removed." });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete ticket.",
        variant: "destructive",
      });
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

  return {
    orgOptions,
    locationOptions,
    chargerOptions,
    selectedOrg,
    setSelectedOrg,
    ticketForm,
    setTicketForm,
    tickets,
    isTicketDialogOpen,
    setIsTicketDialogOpen,
    ticketToEdit,
    setTicketToEdit,
    attachments,
    handleCreateTicket,
    openCreateTicket: () => {
      setTicketToEdit(null);
      setTicketForm(initialTicketForm);
      setIsTicketDialogOpen(true);
    },
    openEditTicket,
    handleUpdateTicket,
    handleDeleteTicket,
    handleFileUpload,
    removeAttachment,
    formatTimeAgo,
    firmwareVersions: firmwareVersions as FirmwareVersion[],
    selectedChargers,
    setSelectedChargers,
    rolloutMode,
    setRolloutMode,
    scheduledTime,
    setScheduledTime,
    isUpgrading,
    slaMetrics,
    slaThresholds,
    setSlaThresholds,
  };
}
