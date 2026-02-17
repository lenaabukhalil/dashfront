import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { FileText, Plus, Upload, X, Clock, Pencil, Trash2 } from "lucide-react";
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
    attachments,
    handleCreateTicket,
    openCreateTicket,
    openEditTicket,
    handleUpdateTicket,
    handleDeleteTicket,
    handleFileUpload,
    removeAttachment,
    getPriorityColor,
    getStatusBadge,
    formatTimeAgo,
  } = data;

  const isEditing = ticketToEdit !== null;

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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Maintenance Tickets
              </CardTitle>
              <CardDescription>
                Create and manage charger maintenance issues with severity levels and lifecycle
                tracking
              </CardDescription>
            </div>
            <Dialog
              open={isTicketDialogOpen}
              onOpenChange={(next) => {
                setIsTicketDialogOpen(next);
                if (!next) data.setTicketToEdit(null);
              }}
            >
              <Button onClick={openCreateTicket}>
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
                      : "Report an issue or request maintenance for a charger. Auto-detection from faults is supported."}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={isEditing ? handleUpdateTicket : handleCreateTicket}
                  className="space-y-4"
                >
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
                      <Select
                        value={ticketForm.status}
                        onValueChange={(val) =>
                          setTicketForm({ ...ticketForm, status: val })
                        }
                      >
                        <SelectTrigger id="ticket-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ticketStatusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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
                      <Label htmlFor="ticket-team">Send to</Label>
                      <Select
                        value={ticketForm.team}
                        onValueChange={(val: "technical" | "financial") =>
                          setTicketForm({ ...ticketForm, team: val })
                        }
                      >
                        <SelectTrigger id="ticket-team">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technical">Technical Team</SelectItem>
                          <SelectItem value="financial">Financial Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-org">Organization</Label>
                      <Select
                        value={selectedOrg}
                        onValueChange={(val) => {
                          setSelectedOrg(val);
                          setTicketForm({
                            ...ticketForm,
                            organization_id: val,
                            location_id: "",
                            charger_id: "",
                          });
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
                    <Button type="submit">
                      {isEditing ? "Update Ticket" : "Create Ticket"}
                    </Button>
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
                <Button onClick={openCreateTicket}>
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditTicket(ticket)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <ConfirmDeleteDialog
                            entityLabel="this maintenance ticket"
                            onConfirm={() => handleDeleteTicket(ticket.id)}
                          >
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </ConfirmDeleteDialog>
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
    </PermissionGuard>
  );
}
