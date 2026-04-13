import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppSelect } from "@/components/shared/AppSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { useSupportData } from "../hooks/useSupportData";

const priorityOptions = [
  { value: "low", label: "Low", color: "bg-gray-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-500" },
];

const ticketStatusOptions = [
  { value: "new", label: "New" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_parts", label: "Waiting for Parts" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

interface MaintenanceTicketsTabProps {
  role: string | null;
  data: ReturnType<typeof useSupportData>;
}

export function MaintenanceTicketsTab({ role, data }: MaintenanceTicketsTabProps) {
  const {
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
    handleCreateTicket,
    openCreateTicket,
    openEditTicket,
    handleUpdateTicket,
    handleDeleteTicket,
  } = data;

  const isEditing = ticketToEdit !== null;
  const organizations = orgOptions.map((option) => ({
    id: option.value,
    name: option.label,
  }));

  return (
    <PermissionGuard
      role={role}
      permission="charger.status"
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
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3 min-w-0">
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
            <div className="space-y-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Maintenance Tickets
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Create and manage charger maintenance issues with severity levels and lifecycle
                tracking.
              </p>
            </div>
          </div>
          <Dialog
            open={isTicketDialogOpen}
            onOpenChange={(next) => {
              setIsTicketDialogOpen(next);
              if (!next) data.setTicketToEdit(null);
            }}
          >
            <Button
              onClick={openCreateTicket}
              className="shrink-0 rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Maintenance Ticket
            </Button>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {isEditing ? "Edit Maintenance Ticket" : "Create Maintenance Ticket"}
                  </DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? "Update the ticket details and status."
                      : "Report an issue or request maintenance for a charger."}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={isEditing ? handleUpdateTicket : handleCreateTicket}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="ticket-title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ticket-title"
                      value={ticketForm.title}
                      onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
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

                  {isEditing && (
                    <div className="space-y-2">
                      <Label htmlFor="ticket-status">Status</Label>
                      <AppSelect
                        options={ticketStatusOptions}
                        value={ticketForm.status}
                        onChange={(val) =>
                          setTicketForm({ ...ticketForm, status: val })
                        }
                        placeholder="Status"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-priority">Priority</Label>
                      <AppSelect
                        options={priorityOptions.map((o) => ({ value: o.value, label: o.label }))}
                        value={ticketForm.priority}
                        onChange={(val) =>
                          setTicketForm({ ...ticketForm, priority: val })
                        }
                        placeholder="Priority"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-team">Send to</Label>
                      <AppSelect
                        options={[
                          { value: "technical", label: "Technical Team" },
                          { value: "financial", label: "Financial Team" },
                        ]}
                        value={ticketForm.team}
                        onChange={(val) =>
                          setTicketForm({ ...ticketForm, team: val as "technical" | "financial" })
                        }
                        placeholder="Send to"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-org">Organization</Label>
                      <AppSelect
                        options={orgOptions}
                        value={selectedOrg}
                        onChange={(val) => {
                          setSelectedOrg(val);
                          setTicketForm({
                            ...ticketForm,
                            organization_id: val,
                            location_id: "",
                            charger_id: "",
                          });
                        }}
                        placeholder="Select organization"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-location">Location</Label>
                      <AppSelect
                        options={locationOptions}
                        value={ticketForm.location_id}
                        onChange={(val) =>
                          setTicketForm({ ...ticketForm, location_id: val, charger_id: "" })
                        }
                        placeholder="Select location"
                        isDisabled={!selectedOrg}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-charger">Charger</Label>
                      <AppSelect
                        options={chargerOptions}
                        value={ticketForm.charger_id}
                        onChange={(val) =>
                          setTicketForm({ ...ticketForm, charger_id: val })
                        }
                        placeholder="Select charger"
                        isDisabled={!ticketForm.location_id}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTicketDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {isEditing ? "Update Ticket" : "Create Ticket"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
          </Dialog>
        </div>

        {tickets.length === 0 ? (
          <EmptyState
            title="No Maintenance Tickets"
            description="Create your first maintenance ticket to track charger issues and repairs."
            action={
              <Button onClick={openCreateTicket}>
                <Plus className="w-4 h-4 mr-2" />
                Create Maintenance Ticket
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-background dark:border-border">
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-[#f0f0f0] bg-[#fafafa] hover:bg-[#fafafa] dark:border-border dark:bg-muted/30 dark:hover:bg-muted/30">
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      ID
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Organization
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Title
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Priority
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Status
                    </TableHead>
                    <TableHead className="h-14 px-4 text-left text-sm font-semibold text-foreground">
                      Charger
                    </TableHead>
                    <TableHead className="h-14 px-4 text-right text-sm font-semibold text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="border-b border-[#f0f0f0] hover:bg-muted/20 dark:border-border"
                    >
                      <TableCell className="px-4 py-4 align-middle font-mono text-xs text-foreground">
                        {ticket.id}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                        {organizations.find((o) => String(o.id) === String(ticket.organization_id))?.name ??
                          "—"}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{ticket.title}</span>
                          {ticket.auto_detected && (
                            <span className="text-xs font-medium text-muted-foreground">Auto</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground capitalize">
                        {priorityOptions.find((p) => p.value === ticket.priority)?.label ||
                          ticket.priority}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-foreground">
                        {ticketStatusOptions.find((s) => s.value === ticket.status)?.label ||
                          ticket.status}
                      </TableCell>
                      <TableCell className="px-4 py-4 align-middle text-sm text-muted-foreground">
                        {ticket.charger_id || "N/A"}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => openEditTicket(ticket)}
                            className="inline-flex text-foreground/80 transition-colors hover:text-foreground"
                            aria-label="Edit ticket"
                          >
                            <Pencil className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                          <ConfirmDeleteDialog
                            entityLabel="this maintenance ticket"
                            onConfirm={() => handleDeleteTicket(ticket.id)}
                          >
                            <button
                              type="button"
                              className="inline-flex text-[#ff4d4f] transition-colors hover:text-[#cf1322]"
                              aria-label="Delete ticket"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </ConfirmDeleteDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
