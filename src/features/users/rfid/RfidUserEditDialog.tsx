import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AppSelect } from "@/components/shared/AppSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  getRfidUser,
  createRfidUser,
  updateRfidUser,
  listLocationsByOrg,
  type RfidAccessScope,
  type CreateRfidUserPayload,
  type UpdateRfidUserPayload,
} from "@/services/api";
import { effectiveAccessScope } from "@/features/users/rfid/rfidAccessScope";
import { IonUserPicker, type IonUserPickerUser } from "@/features/users/rfid/IonUserPicker";
import { toUserIdNumber } from "@/features/users/live-activity/liveActivityShared";
import { Loader2 } from "lucide-react";

const RFID_UID_RE = /^[A-F0-9]{4,32}$/;

function isPortaledSelectMenuTarget(node: EventTarget | null | undefined): boolean {
  if (!(node instanceof Element)) return false;
  return Boolean(
    node.closest(".react-select__menu") ||
      node.closest(".react-select__menu-portal") ||
      node.closest('[class*="react-select"]') ||
      node.closest(".app-select__menu") ||
      node.closest(".app-select__menu-portal") ||
      node.closest('[class*="app-select"]'),
  );
}

function getOutsideEventTarget(
  event: { target: EventTarget | null; detail?: { originalEvent?: Event } },
): EventTarget | null {
  const orig = event.detail?.originalEvent;
  if (orig && "target" in orig && orig.target) return orig.target as EventTarget;
  return event.target;
}

function normalizeAllowedLocationIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
}

export type RfidUserFormState = {
  rfid_uid: string;
  organization_id: number;
  status: "active" | "blocked";
  access_scope: RfidAccessScope;
  allowed_locations: number[];
  user_id: number | null;
  first_name: string;
  last_name: string;
  mobile: string;
  email: string;
};

const emptyForm = (orgId: number): RfidUserFormState => ({
  rfid_uid: "",
  organization_id: orgId,
  status: "active",
  access_scope: "organization",
  allowed_locations: [],
  user_id: null,
  first_name: "",
  last_name: "",
  mobile: "",
  email: "",
});

interface RfidUserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
  orgOptions: { value: string; label: string }[];
  loadingOrg: boolean;
  firstOrgId: number;
  canRwRfid: boolean;
  onSaved: () => void;
}

export function RfidUserEditDialog({
  open,
  onOpenChange,
  editingId,
  orgOptions,
  loadingOrg,
  firstOrgId,
  canRwRfid,
  onSaved,
}: RfidUserEditDialogProps) {
  const [form, setForm] = useState<RfidUserFormState>(() => emptyForm(firstOrgId));
  const [submitting, setSubmitting] = useState(false);
  const [loadingOne, setLoadingOne] = useState(false);
  const [rfidUidError, setRfidUidError] = useState<string | null>(null);
  const [orgLocations, setOrgLocations] = useState<Array<{ location_id: number; name: string }>>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsSelectionError, setLocationsSelectionError] = useState<string | null>(null);
  const [linkedDisplayUser, setLinkedDisplayUser] = useState<IonUserPickerUser | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingId == null) {
      setRfidUidError(null);
      setLocationsSelectionError(null);
      setLinkedDisplayUser(null);
      setForm(emptyForm(firstOrgId));
      return;
    }

    let cancelled = false;
    setLoadingOne(true);
    setRfidUidError(null);
    setLocationsSelectionError(null);

    void getRfidUser(editingId)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          toast({ title: "Error", description: "RFID user not found", variant: "destructive" });
          onOpenChange(false);
          return;
        }
        const scope = effectiveAccessScope(row);
        const locIds = normalizeAllowedLocationIds(row.allowed_locations ?? null);
        const linkedId = toUserIdNumber(row.linked_user_id ?? row.user_id);
        setForm({
          rfid_uid: String(row.rfid_uid ?? "").toUpperCase(),
          organization_id: row.organization_id,
          status: row.status === "blocked" ? "blocked" : "active",
          access_scope: scope,
          allowed_locations: scope === "locations" ? locIds : [],
          user_id: linkedId,
          first_name: row.first_name != null ? String(row.first_name).trim() : "",
          last_name: row.last_name != null ? String(row.last_name).trim() : "",
          mobile: row.mobile != null ? String(row.mobile).trim() : "",
          email: row.email != null ? String(row.email).trim() : "",
        });
        if (linkedId != null) {
          setLinkedDisplayUser({
            user_id: linkedId,
            first_name: String(row.linked_first_name ?? "").trim(),
            last_name: String(row.linked_last_name ?? "").trim(),
            mobile: String(row.linked_mobile ?? "").trim(),
          });
        } else {
          setLinkedDisplayUser(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        toast({
          title: "Error",
          description: e instanceof Error ? e.message : "Failed to load RFID user",
          variant: "destructive",
        });
        onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingOne(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, editingId, firstOrgId, onOpenChange]);

  useEffect(() => {
    if (!open || form.organization_id < 1 || form.access_scope !== "locations") {
      setOrgLocations([]);
      setLocationsLoading(false);
      return;
    }
    let cancelled = false;
    setLocationsLoading(true);
    void listLocationsByOrg(form.organization_id)
      .then((list) => {
        if (!cancelled) setOrgLocations(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setOrgLocations([]);
          toast({
            title: "Failed to load locations",
            description: err instanceof Error ? err.message : "Could not load locations for this organization.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, form.organization_id, form.access_scope]);

  const validateForm = (): string | null => {
    const uid = form.rfid_uid.trim().toUpperCase();
    if (!RFID_UID_RE.test(uid)) return "RFID UID must be 4–32 hex characters (A–F, 0–9).";
    if (!form.organization_id || form.organization_id < 1) return "Organization is required.";
    if (form.access_scope === "locations" && form.allowed_locations.length === 0) {
      return "Select at least one location for “Specific locations”.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRwRfid) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    setRfidUidError(null);
    setLocationsSelectionError(null);
    const err = validateForm();
    if (err) {
      if (form.access_scope === "locations" && form.allowed_locations.length === 0) {
        setLocationsSelectionError("Select at least one location.");
      }
      toast({ title: "Validation", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const locIdsForPayload =
        form.access_scope === "locations"
          ? form.allowed_locations.map((n) => Number(n)).filter((n) => Number.isFinite(n))
          : null;
      const cardholderFields = {
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
        email: form.email.trim() || undefined,
      };
      if (editingId) {
        const payload: UpdateRfidUserPayload = {
          rfid_uid: form.rfid_uid.trim().toUpperCase(),
          organization_id: form.organization_id,
          status: form.status,
          access_scope: form.access_scope,
          allowed_locations: locIdsForPayload,
          user_id: form.user_id,
          ...cardholderFields,
        };
        const res = await updateRfidUser(editingId, payload);
        if (!res.success) {
          toast({ title: "Error", description: res.message, variant: "destructive" });
          return;
        }
        toast({ title: "Updated", description: res.message });
      } else {
        const payload: CreateRfidUserPayload = {
          rfid_uid: form.rfid_uid.trim().toUpperCase(),
          organization_id: form.organization_id,
          access_scope: form.access_scope,
          allowed_locations: locIdsForPayload,
          user_id: form.user_id,
          ...cardholderFields,
        };
        const res = await createRfidUser(payload);
        if (!res.success) {
          if (res.duplicate) {
            setRfidUidError("This RFID UID is already registered.");
            return;
          }
          toast({ title: "Error", description: res.message, variant: "destructive" });
          return;
        }
        toast({ title: "Created", description: res.message });
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isLinked = form.user_id != null;

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <div
          role="presentation"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          aria-hidden
          onPointerDown={() => onOpenChange(false)}
        />
      </DialogPortal>
      <DialogContent
        className="z-[51] max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          const target = getOutsideEventTarget(e);
          if (isPortaledSelectMenuTarget(target)) e.preventDefault();
        }}
        onFocusOutside={(e) => {
          const orig = e.detail.originalEvent;
          const related = orig instanceof FocusEvent ? orig.relatedTarget : null;
          if (
            isPortaledSelectMenuTarget(getOutsideEventTarget(e)) ||
            isPortaledSelectMenuTarget(related)
          ) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = getOutsideEventTarget(e);
          if (isPortaledSelectMenuTarget(target)) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit RFID User" : "Add RFID User"}</DialogTitle>
          <DialogDescription>
            {editingId ? "Update RFID card details." : "Register a new RFID card for charging."}
          </DialogDescription>
        </DialogHeader>
        {loadingOne ? (
          <p className="py-4 text-muted-foreground">Loading...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
              <Label className="text-sm font-semibold">Link to ION account (optional)</Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Link this card to an existing ION app user. The user&apos;s name, mobile, and email
                will be used to identify the cardholder. Leave empty to enter cardholder info manually.
              </p>
              <IonUserPicker
                value={form.user_id}
                displayUser={linkedDisplayUser}
                disabled={!canRwRfid}
                onChange={(userId, user) => {
                  setForm((f) => ({ ...f, user_id: userId }));
                  setLinkedDisplayUser(user ?? null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Cardholder details</Label>
              {isLinked ? (
                <p className="text-xs text-muted-foreground">
                  These will fall back to the linked ION user when not provided.
                </p>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rfid-first-name">First name</Label>
                  <Input
                    id="rfid-first-name"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfid-last-name">Last name</Label>
                  <Input
                    id="rfid-last-name"
                    value={form.last_name}
                    onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfid-mobile">Mobile</Label>
                  <Input
                    id="rfid-mobile"
                    value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfid-email">Email</Label>
                  <Input
                    id="rfid-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>
                  RFID UID <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="font-mono uppercase"
                  value={form.rfid_uid}
                  onChange={(e) => {
                    setRfidUidError(null);
                    setForm((f) => ({ ...f, rfid_uid: e.target.value.toUpperCase() }));
                  }}
                  placeholder="E.g. 298EF26F"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">Hex characters only (A–F, 0–9)</p>
                {rfidUidError && <p className="text-xs text-destructive">{rfidUidError}</p>}
              </div>
              <div className="space-y-2">
                <Label>
                  Organization <span className="text-destructive">*</span>
                </Label>
                <AppSelect
                  options={orgOptions ?? []}
                  value={String(form.organization_id)}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      organization_id: Number(v) || 0,
                      allowed_locations: [],
                    }))
                  }
                  placeholder="Select organization"
                  isDisabled={loadingOrg}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Charging access scope</Label>
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex flex-col gap-3" role="radiogroup" aria-label="Charging access scope">
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="radio"
                        name="rfid-access-scope"
                        className="mt-1 h-4 w-4 accent-primary shrink-0"
                        checked={form.access_scope === "organization"}
                        onChange={() => {
                          setLocationsSelectionError(null);
                          setForm((f) => ({
                            ...f,
                            access_scope: "organization",
                            allowed_locations: [],
                          }));
                        }}
                      />
                      <span className="text-sm font-normal">Whole organization</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="radio"
                        name="rfid-access-scope"
                        className="mt-1 h-4 w-4 accent-primary shrink-0"
                        checked={form.access_scope === "locations"}
                        onChange={() => {
                          setLocationsSelectionError(null);
                          setForm((f) => ({ ...f, access_scope: "locations" }));
                        }}
                      />
                      <span className="text-sm font-normal">Specific locations</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="radio"
                        name="rfid-access-scope"
                        className="mt-1 h-4 w-4 accent-primary shrink-0"
                        checked={form.access_scope === "none"}
                        onChange={() => {
                          setLocationsSelectionError(null);
                          setForm((f) => ({
                            ...f,
                            access_scope: "none",
                            allowed_locations: [],
                          }));
                        }}
                      />
                      <span className="text-sm font-normal">No access (suspend)</span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Whole organization: charge at any charger of the org. Specific locations: limit charging to
                    selected locations. No access: card exists but cannot start a session.
                  </p>
                  {form.access_scope === "locations" ? (
                    <div className="space-y-2 pt-1">
                      {locationsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading locations…
                        </div>
                      ) : orgLocations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No locations for this organization.</p>
                      ) : (
                        <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border bg-background p-2">
                          {orgLocations.map((loc) => {
                            const checked = form.allowed_locations.includes(loc.location_id);
                            return (
                              <label
                                key={loc.location_id}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => {
                                    setLocationsSelectionError(null);
                                    const on = v === true;
                                    setForm((f) => ({
                                      ...f,
                                      allowed_locations: on
                                        ? f.allowed_locations.includes(loc.location_id)
                                          ? f.allowed_locations
                                          : [...f.allowed_locations, loc.location_id]
                                        : f.allowed_locations.filter((id) => id !== loc.location_id),
                                    }));
                                  }}
                                />
                                <span className="text-sm">
                                  {loc.name}{" "}
                                  <span className="font-mono text-xs text-muted-foreground">#{loc.location_id}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {locationsSelectionError ? (
                        <p className="text-xs text-destructive">{locationsSelectionError}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              {editingId && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Status</Label>
                  <div className="flex flex-wrap gap-6" role="radiogroup" aria-label="Status">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rfid-user-status"
                        className="h-4 w-4 accent-primary shrink-0"
                        checked={form.status === "active"}
                        onChange={() => setForm((f) => ({ ...f, status: "active" }))}
                      />
                      <span className="text-sm font-normal">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rfid-user-status"
                        className="h-4 w-4 accent-primary shrink-0"
                        checked={form.status === "blocked"}
                        onChange={() => setForm((f) => ({ ...f, status: "blocked" }))}
                      />
                      <span className="text-sm font-normal">Blocked</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
