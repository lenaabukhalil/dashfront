import * as React from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Building2, CheckCircle2, DollarSign, Loader2, MapPin, Plug, Archive, Users, Zap } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { DeleteWizardProgress } from "@/components/delete-wizard/DeleteWizardProgress";
import { DeleteWizardComplete } from "@/components/delete-wizard/DeleteWizardComplete";
import { DeleteConfirmDialog } from "@/components/delete-wizard/DeleteConfirmDialog";
import { useDeleteWizardState } from "@/hooks/useDeleteWizardState";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "@/hooks/use-toast";
import { AppSelect } from "@/components/shared/AppSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteCharger,
  deleteConnector,
  deleteLocation,
  deleteOrganization,
  deletePartnerUser,
  deleteTariff,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  fetchLocationsByOrg,
  fetchOrganizations,
  fetchPartnerUsersByOrganization,
  fetchTariffByConnector,
  type PartnerUserRecord,
} from "@/services/api";

type EntityRow = { id: string; name: string; extra?: string; createdAt?: string };

const ARCHIVE_STEP_NO_PERM_TITLE = "You do not have archive permission for this step";
const ARCHIVE_USERS_NO_PERM_TITLE = "You do not have archive permission for users";

function isGatewayTimeout504(message: string | undefined): boolean {
  if (!message) return false;
  return /\b504\b|Gateway Timeout|gateway timeout/i.test(message);
}

export default function DeleteWizard() {
  const navigate = useNavigate();
  const wizard = useDeleteWizardState();
  const { state } = wizard;
  const { canWrite } = usePermission();

  const [organizations, setOrganizations] = React.useState<Array<{ id: string; name: string; details?: string }>>([]);
  const [loadingScope, setLoadingScope] = React.useState(false);
  const [selectedOrgId, setSelectedOrgId] = React.useState("");

  const [tariffs, setTariffs] = React.useState<EntityRow[]>([]);
  const [connectors, setConnectors] = React.useState<EntityRow[]>([]);
  const [chargers, setChargers] = React.useState<EntityRow[]>([]);
  const [locations, setLocations] = React.useState<EntityRow[]>([]);
  const [orgUsers, setOrgUsers] = React.useState<PartnerUserRecord[]>([]);

  const [loadingStep, setLoadingStep] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [archivingAll, setArchivingAll] = React.useState(false);
  const [archiveAllTotal, setArchiveAllTotal] = React.useState(0);
  const [deletingRowIds, setDeletingRowIds] = React.useState<Record<string, boolean>>({});

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [orgDeleteBusy, setOrgDeleteBusy] = React.useState(false);
  const [checkingOrgGuard, setCheckingOrgGuard] = React.useState(false);
  const [orgGuardUsersCount, setOrgGuardUsersCount] = React.useState(0);
  const selectAllUsersRef = React.useRef<HTMLInputElement | null>(null);

  const [deletedCounts, setDeletedCounts] = React.useState({
    tariffs: 0,
    connectors: 0,
    chargers: 0,
    locations: 0,
    users: 0,
    organizations: 0,
  });

  const hasItemsRemaining = {
    1: tariffs.length > 0,
    2: connectors.length > 0,
    3: chargers.length > 0,
    4: locations.length > 0,
    5: orgUsers.length > 0,
  } as Record<number, boolean>;

  React.useEffect(() => {
    const run = async () => {
      setLoadingScope(true);
      try {
        const list = await fetchOrganizations();
        setOrganizations(
          list.map((org) => ({
            id: String(org.id),
            name: org.name || `Organization ${org.id}`,
            details: (org as unknown as { details?: string }).details,
          }))
        );
      } catch (error) {
        toast({
          title: "Failed to load organizations",
          description: error instanceof Error ? error.message : "Could not load organizations",
          variant: "destructive",
        });
      } finally {
        setLoadingScope(false);
      }
    };
    void run();
  }, []);

  React.useEffect(() => {
    if (!deleting && !orgDeleteBusy && !archivingAll) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [archivingAll, deleting, orgDeleteBusy]);

  const scopeOrg = useMemo(
    () => organizations.find((x) => x.id === state.organizationId) ?? null,
    [organizations, state.organizationId]
  );

  const clearStepSelection = () => setSelectedIds([]);

  const loadStepData = React.useCallback(
    async (step: number) => {
      if (!state.organizationId) return;
      setLoadingStep(true);
      try {
        const locationOpts = await fetchLocationsByOrg(state.organizationId);
        const locationRows = locationOpts.map((l) => ({ id: l.value, name: l.label }));
        setLocations(locationRows);

        const chargerRows: EntityRow[] = [];
        for (const loc of locationOpts) {
          const chargersForLocation = await fetchChargersByLocation(loc.value);
          chargersForLocation.forEach((c) =>
            chargerRows.push({ id: c.value, name: c.label, extra: `Location: ${loc.label}` })
          );
        }
        setChargers(chargerRows);

        const connectorRows: EntityRow[] = [];
        for (const charger of chargerRows) {
          const connectorsForCharger = await fetchConnectorsByCharger(charger.id);
          connectorsForCharger.forEach((c) =>
            connectorRows.push({ id: c.value, name: c.label, extra: `Charger: ${charger.name}` })
          );
        }
        setConnectors(connectorRows);

        const tariffRows: EntityRow[] = [];
        for (const connector of connectorRows) {
          const tariff = await fetchTariffByConnector(connector.id);
          const tariffId = String((tariff as { tariff_id?: string })?.tariff_id ?? "").trim();
          if (tariffId) {
            tariffRows.push({
              id: tariffId,
              name: String((tariff as { type?: string })?.type ?? `Tariff ${tariffId}`),
              extra: `Connector: ${connector.name}`,
              createdAt: String((tariff as { created_at?: string })?.created_at ?? ""),
            });
          }
        }
        setTariffs(tariffRows);

        if (step >= 5) {
          const users = await fetchPartnerUsersByOrganization(state.organizationId);
          setOrgUsers(users);
        }
      } catch (error) {
        toast({
          title: "Failed to refresh data",
          description: error instanceof Error ? error.message : "Please refresh and try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingStep(false);
      }
    },
    [state.organizationId]
  );

  React.useEffect(() => {
    if (!state.organizationId || state.currentStep === 0) return;
    void loadStepData(state.currentStep);
    clearStepSelection();
  }, [state.currentStep, state.organizationId, loadStepData]);

  const stepRows = useMemo(() => {
    if (state.currentStep === 1) return tariffs;
    if (state.currentStep === 2) return connectors;
    if (state.currentStep === 3) return chargers;
    if (state.currentStep === 4) return locations;
    return [];
  }, [state.currentStep, tariffs, connectors, chargers, locations]);

  React.useEffect(() => {
    if (!selectAllUsersRef.current || state.currentStep !== 5) return;
    const allChecked = orgUsers.length > 0 && selectedIds.length === orgUsers.length;
    const indeterminate = selectedIds.length > 0 && selectedIds.length < orgUsers.length;
    selectAllUsersRef.current.checked = allChecked;
    selectAllUsersRef.current.indeterminate = indeterminate;
  }, [orgUsers.length, selectedIds.length, state.currentStep]);

  const toggleId = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () => {
    if (selectedIds.length === stepRows.length) setSelectedIds([]);
    else setSelectedIds(stepRows.map((r) => r.id));
  };

  const getPermissionForStep = (step: number) => {
    if (step === 1) return canWrite("tariff");
    if (step === 2) return canWrite("charger.enable_disable");
    if (step === 3) return canWrite("charger.enable_disable");
    if (step === 4) return canWrite("org.name");
    if (step === 5) return canWrite("users.edit");
    if (step === 6) return canWrite("org.name");
    return false;
  };

  const performStepDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    const failures: string[] = [];
    let successCount = 0;

    for (const id of selectedIds) {
      setDeletingRowIds((prev) => ({ ...prev, [id]: true }));
      let stopped504 = false;
      try {
        let result: { success: boolean; message?: string } = { success: false, message: "Invalid step" };
        if (state.currentStep === 1) result = await deleteTariff(id);
        if (state.currentStep === 2) result = await deleteConnector(id);
        if (state.currentStep === 3) result = await deleteCharger(id);
        if (state.currentStep === 4) result = await deleteLocation(id);
        if (!result.success) {
          const msg = result.message || "Unknown error";
          if (isGatewayTimeout504(msg)) {
            toast({
              title: "Server is busy",
              description: "Server is busy. Some items were not archived. Please try again.",
              variant: "destructive",
            });
            stopped504 = true;
          } else {
            failures.push(`${id}: ${msg}`);
          }
        } else {
          successCount += 1;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed";
        if (isGatewayTimeout504(msg)) {
          toast({
            title: "Server is busy",
            description: "Server is busy. Please try again in a moment.",
            variant: "destructive",
          });
          stopped504 = true;
        } else {
          failures.push(`${id}: ${msg}`);
        }
      } finally {
        setDeletingRowIds((prev) => ({ ...prev, [id]: false }));
      }
      if (stopped504) break;
    }

    setDeleting(false);
    setSelectedIds([]);
    await loadStepData(state.currentStep);

    if (state.currentStep === 1) setDeletedCounts((p) => ({ ...p, tariffs: p.tariffs + successCount }));
    if (state.currentStep === 2) setDeletedCounts((p) => ({ ...p, connectors: p.connectors + successCount }));
    if (state.currentStep === 3) setDeletedCounts((p) => ({ ...p, chargers: p.chargers + successCount }));
    if (state.currentStep === 4) setDeletedCounts((p) => ({ ...p, locations: p.locations + successCount }));

    if (failures.length > 0) {
      toast({
        title: `Archived ${successCount}/${selectedIds.length}`,
        description: `Failed: ${failures.slice(0, 2).join(" | ")}${failures.length > 2 ? "..." : ""}`,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Archive complete", description: `Archived ${successCount} item(s).` });
  };

  const getAllIdsForCurrentStep = React.useCallback(() => {
    if (state.currentStep === 1) return tariffs.map((row) => row.id);
    if (state.currentStep === 2) return connectors.map((row) => row.id);
    if (state.currentStep === 3) return chargers.map((row) => row.id);
    if (state.currentStep === 4) return locations.map((row) => row.id);
    if (state.currentStep === 5) {
      return orgUsers
        .map((u) => String(u.user_id ?? ""))
        .filter((id) => id !== "");
    }
    return [];
  }, [chargers, connectors, locations, orgUsers, state.currentStep, tariffs]);

  const performArchiveAllAndContinue = async () => {
    const idsToArchive = getAllIdsForCurrentStep();
    if (idsToArchive.length === 0) {
      await goNext();
      return;
    }

    setArchivingAll(true);
    setArchiveAllTotal(idsToArchive.length);
    const failures: string[] = [];
    let successCount = 0;

    for (const id of idsToArchive) {
      setDeletingRowIds((prev) => ({ ...prev, [id]: true }));
      let stopped504 = false;
      try {
        let result: { success: boolean; message?: string } = { success: false, message: "Invalid step" };
        if (state.currentStep === 1) result = await deleteTariff(id);
        if (state.currentStep === 2) result = await deleteConnector(id);
        if (state.currentStep === 3) result = await deleteCharger(id);
        if (state.currentStep === 4) result = await deleteLocation(id);
        if (state.currentStep === 5) result = await deletePartnerUser(id);
        if (!result.success) {
          const msg = result.message || "Unknown error";
          if (isGatewayTimeout504(msg)) {
            toast({
              title: "Server is busy",
              description: "Server is busy. Some items were not archived. Please try again.",
              variant: "destructive",
            });
            stopped504 = true;
          } else {
            failures.push(`${id}: ${msg}`);
          }
        } else {
          successCount += 1;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed";
        if (isGatewayTimeout504(msg)) {
          toast({
            title: "Server is busy",
            description: "Server is busy. Please try again in a moment.",
            variant: "destructive",
          });
          stopped504 = true;
        } else {
          failures.push(`${id}: ${msg}`);
        }
      } finally {
        setDeletingRowIds((prev) => ({ ...prev, [id]: false }));
      }
      if (stopped504) break;
    }

    setArchivingAll(false);
    setArchiveAllTotal(0);
    setSelectedIds([]);
    await loadStepData(state.currentStep);

    if (state.currentStep === 1) setDeletedCounts((p) => ({ ...p, tariffs: p.tariffs + successCount }));
    if (state.currentStep === 2) setDeletedCounts((p) => ({ ...p, connectors: p.connectors + successCount }));
    if (state.currentStep === 3) setDeletedCounts((p) => ({ ...p, chargers: p.chargers + successCount }));
    if (state.currentStep === 4) setDeletedCounts((p) => ({ ...p, locations: p.locations + successCount }));
    if (state.currentStep === 5) {
      setDeletedCounts((p) => ({ ...p, users: p.users + successCount }));
    }

    if (failures.length > 0) {
      toast({
        title: `Archived ${successCount}/${idsToArchive.length}`,
        description: `Failed: ${failures.slice(0, 2).join(" | ")}${failures.length > 2 ? "..." : ""}`,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Archive complete", description: `Archived ${successCount} item(s).` });
    await goNext();
  };

  const goNext = async () => {
    if (state.currentStep >= 1 && state.currentStep <= 5) {
      const remainingCount = getAllIdsForCurrentStep().length;
      if (remainingCount > 0) {
        toast({
          title: "Items not archived",
          description: `${remainingCount} items were not archived. They will remain visible until soft-deleted.`,
          variant: "destructive",
        });
      }
    }
    wizard.markStepComplete(state.currentStep);
    wizard.advanceStep();
    await loadStepData(state.currentStep + 1);
  };

  const performUsersDelete = async () => {
    if (!state.organizationId || selectedIds.length === 0) return;
    setDeleting(true);
    const failures: string[] = [];
    let successCount = 0;
    for (const id of selectedIds) {
      setDeletingRowIds((prev) => ({ ...prev, [id]: true }));
      let stopped504 = false;
      try {
        const res = await deletePartnerUser(id);
        if (!res.success) {
          const msg = res.message || "Unknown error";
          if (isGatewayTimeout504(msg)) {
            toast({
              title: "Server is busy",
              description: "Server is busy. Some items were not archived. Please try again.",
              variant: "destructive",
            });
            stopped504 = true;
          } else {
            failures.push(`${id}: ${msg}`);
          }
        } else {
          successCount += 1;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed";
        if (isGatewayTimeout504(msg)) {
          toast({
            title: "Server is busy",
            description: "Server is busy. Please try again in a moment.",
            variant: "destructive",
          });
          stopped504 = true;
        } else {
          failures.push(`${id}: ${msg}`);
        }
      } finally {
        setDeletingRowIds((prev) => ({ ...prev, [id]: false }));
      }
      if (stopped504) break;
    }
    setDeleting(false);
    setSelectedIds([]);
    await loadStepData(5);
    setDeletedCounts((p) => ({ ...p, users: p.users + successCount }));
    if (failures.length > 0) {
      toast({
        title: `Archived ${successCount}/${selectedIds.length}`,
        description: `Failed: ${failures.slice(0, 2).join(" | ")}${failures.length > 2 ? "..." : ""}`,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Users archived", description: `Archived ${successCount} user(s).` });
  };

  const checkOrgStepGuard = React.useCallback(async () => {
    if (!state.organizationId || state.currentStep !== 6) return;
    setCheckingOrgGuard(true);
    try {
      const users = await fetchPartnerUsersByOrganization(state.organizationId);
      setOrgUsers(users);
      setOrgGuardUsersCount(users.length);
    } finally {
      setCheckingOrgGuard(false);
    }
  }, [state.currentStep, state.organizationId]);

  React.useEffect(() => {
    void checkOrgStepGuard();
  }, [checkOrgStepGuard]);

  const handleFinalDeleteOrg = async () => {
    if (!state.organizationId) return;
    setOrgDeleteBusy(true);
    try {
      const orgRes = await deleteOrganization(Number(state.organizationId));
      if (!orgRes.success) {
        toast({
          title: "Organization archive failed",
          description: orgRes.message || "Failed to archive organization",
          variant: "destructive",
        });
        return;
      }
      setDeletedCounts((p) => ({ ...p, organizations: 1 }));
      wizard.markStepComplete(6);
      toast({ title: "Organization archived", description: "Archive complete." });
    } catch (error) {
      toast({
        title: "Archive failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setOrgDeleteBusy(false);
    }
  };

  const summary = [
    { label: "Tariffs", value: String(deletedCounts.tariffs) },
    { label: "Connectors", value: String(deletedCounts.connectors) },
    { label: "Chargers", value: String(deletedCounts.chargers) },
    { label: "Locations", value: String(deletedCounts.locations) },
    { label: "Users", value: String(deletedCounts.users) },
    { label: "Organization", value: String(deletedCounts.organizations) },
  ];

  const stepIcon =
    state.currentStep === 1
      ? DollarSign
      : state.currentStep === 2
        ? Plug
        : state.currentStep === 3
          ? Zap
          : state.currentStep === 4
            ? MapPin
            : state.currentStep === 5
              ? Users
              : Building2;
  const StepIcon = stepIcon;

  /** Steps 1–4 only; when outside that range, unused (treated as true for unrelated UI). */
  const canArchiveCurrentTableStep =
    state.currentStep >= 1 && state.currentStep <= 4 ? getPermissionForStep(state.currentStep) : true;
  const canArchiveUsersStep = canWrite("users.edit");

  return (
    <PermissionGuard
      permission="org.name"
      action="write"
      fallback={
        <DashboardLayout>
          <Card>
            <CardHeader>
              <CardTitle>Archive Wizard</CardTitle>
              <CardDescription>You do not have permission to access this page.</CardDescription>
            </CardHeader>
          </Card>
        </DashboardLayout>
      }
    >
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Archive Wizard</h1>
            <p className="text-sm text-muted-foreground">
              Archive in order: Tariff → Connector → Charger → Location → User → Organization
            </p>
          </div>

          {state.currentStep > 0 && (
            <DeleteWizardProgress
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
              onStepClick={wizard.goToStep}
            />
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3">
              {wizard.allCompleted ? (
                <DeleteWizardComplete
                  summary={summary}
                  onGoDashboard={() => navigate("/dashboard")}
                  onStartAnother={() => {
                    wizard.resetWizard();
                    setSelectedOrgId("");
                    setDeletedCounts({ tariffs: 0, connectors: 0, chargers: 0, locations: 0, users: 0, organizations: 0 });
                    setTariffs([]);
                    setConnectors([]);
                    setChargers([]);
                    setLocations([]);
                    setOrgUsers([]);
                  }}
                />
              ) : state.currentStep === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Select Organization Scope</CardTitle>
                    <CardDescription>Choose the organization to archive.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        Warning
                      </div>
                      <p className="mt-2">
                        You are about to archive all data under Organization:{" "}
                        <strong>{organizations.find((o) => o.id === selectedOrgId)?.name || "—"}</strong>. Records will be hidden but preserved for historical reports. They can be restored by an administrator.
                      </p>
                    </div>
                    <AppSelect
                      options={organizations.map((o) => ({ value: o.id, label: o.name }))}
                      value={selectedOrgId}
                      onChange={setSelectedOrgId}
                      placeholder={loadingScope ? "Loading organizations..." : "Select organization"}
                      isDisabled={loadingScope}
                    />
                    <Button
                      variant="outline"
                      disabled={!selectedOrgId || loadingScope}
                      onClick={() => {
                        const org = organizations.find((o) => o.id === selectedOrgId);
                        if (!org) return;
                        wizard.setScope(org.id, org.name);
                      }}
                    >
                      Start Archive
                    </Button>
                  </CardContent>
                </Card>
              ) : state.currentStep >= 1 && state.currentStep <= 4 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <StepIcon className="h-5 w-5 text-amber-600" />
                      Step {state.currentStep}: Soft Delete{" "}
                      {state.currentStep === 1 ? "Tariffs" : state.currentStep === 2 ? "Connectors" : state.currentStep === 3 ? "Chargers" : "Locations"}
                    </CardTitle>
                    <CardDescription>
                      {stepRows.length === 0
                        ? "No items found. You can proceed to the next step."
                        : "Select one or more records and archive them, or archive all and continue."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stepRows.length > 0 ? (
                      <div className="rounded-lg border">
                        <div
                          className={`grid grid-cols-[40px_1fr_1fr_160px] gap-2 border-b bg-muted/30 px-3 py-2 text-sm font-medium ${!canArchiveCurrentTableStep ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.length > 0 && selectedIds.length === stepRows.length}
                            onChange={toggleAll}
                            disabled={deleting || loadingStep || !canArchiveCurrentTableStep}
                            title={!canArchiveCurrentTableStep ? ARCHIVE_STEP_NO_PERM_TITLE : undefined}
                          />
                          <span>Name</span>
                          <span>Details</span>
                          <span>ID</span>
                        </div>
                        {stepRows.map((row) => (
                          <div key={row.id} className="grid grid-cols-[40px_1fr_1fr_160px] gap-2 border-b px-3 py-2 text-sm last:border-b-0">
                            <div className="flex items-center">
                              {deletingRowIds[row.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(row.id)}
                                  onChange={() => toggleId(row.id)}
                                  disabled={deleting || loadingStep || !canArchiveCurrentTableStep}
                                  title={!canArchiveCurrentTableStep ? ARCHIVE_STEP_NO_PERM_TITLE : undefined}
                                />
                              )}
                            </div>
                            <span className="truncate">{row.name}</span>
                            <span className="truncate text-muted-foreground">{row.extra || "—"}</span>
                            <span className="truncate font-mono text-xs">{row.id}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No records found in this step.
                      </div>
                    )}

                    {state.currentStep > 0 && !canArchiveCurrentTableStep ? (
                      <p className="text-sm text-destructive">{ARCHIVE_STEP_NO_PERM_TITLE}.</p>
                    ) : null}

                    {hasItemsRemaining[state.currentStep] ? (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                        {stepRows.length} items will be soft-deleted in this step.
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between">
                      <Button variant="outline" onClick={wizard.goBackStep} disabled={deleting || loadingStep || archivingAll}>
                        Back
                      </Button>
                      <div className="flex items-center gap-2">
                        {canArchiveCurrentTableStep ? (
                          <DeleteConfirmDialog
                            title={`Archive ${selectedIds.length} item(s)?`}
                            description="These records will be hidden from all views but kept in the database for historical reporting. Restore them anytime from the Deleted Records view."
                            confirmLabel="Archive Selected"
                            loading={deleting}
                            onConfirm={performStepDelete}
                          >
                            <Button
                              variant="destructive"
                              disabled={selectedIds.length === 0 || deleting || loadingStep || archivingAll}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Soft Delete Selected
                            </Button>
                          </DeleteConfirmDialog>
                        ) : (
                          <Button variant="destructive" disabled title={ARCHIVE_STEP_NO_PERM_TITLE}>
                            <Archive className="mr-2 h-4 w-4" />
                            Soft Delete Selected
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => void performArchiveAllAndContinue()}
                          disabled={deleting || loadingStep || archivingAll || !canArchiveCurrentTableStep}
                          title={!canArchiveCurrentTableStep ? ARCHIVE_STEP_NO_PERM_TITLE : undefined}
                        >
                          {archivingAll ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {`Archiving ${archiveAllTotal} items...`}
                            </>
                          ) : (
                            "Archive All & Continue"
                          )}
                        </Button>
                        <Button
                          onClick={() => void goNext()}
                          disabled={deleting || loadingStep || archivingAll}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : state.currentStep === 5 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-600" />
                      Step 5: Soft Delete Users
                    </CardTitle>
                    <CardDescription>
                      Scope: Organization "{scopeOrg?.name || state.organizationName || "—"}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                      <p>Archiving users revokes their access immediately. Records will be hidden but preserved for historical reports. They can be restored by an administrator.</p>
                    </div>

                    {orgUsers.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-8 text-center">
                        <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No users found. Click Continue to proceed to Organization archive.
                        </p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <Button variant="outline" onClick={wizard.goBackStep}>Back</Button>
                          <Button
                            onClick={async () => {
                              wizard.markStepComplete(5);
                              wizard.advanceStep();
                              await loadStepData(6);
                            }}
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              ref={selectAllUsersRef}
                              type="checkbox"
                              checked={orgUsers.length > 0 && selectedIds.length === orgUsers.length}
                              onChange={() => {
                                if (selectedIds.length === orgUsers.length) setSelectedIds([]);
                                else {
                                setSelectedIds(
                                    orgUsers
                                      .map((u) => String(u.user_id ?? ""))
                                      .filter((id) => id !== "")
                                  );
                                }
                              }}
                              disabled={deleting || loadingStep || !canArchiveUsersStep}
                              title={!canArchiveUsersStep ? ARCHIVE_USERS_NO_PERM_TITLE : undefined}
                            />
                            Select All ({orgUsers.length} users)
                          </label>
                          <Button variant="outline" size="sm" onClick={() => void loadStepData(5)} disabled={deleting || loadingStep}>
                            Refresh
                          </Button>
                        </div>

                        <div className="rounded-lg border">
                          <div className="grid grid-cols-[40px_1fr_1fr_1fr_120px_140px] gap-2 border-b bg-muted/30 px-3 py-2 text-sm font-medium">
                            <span />
                            <span>Name</span>
                            <span>Email</span>
                            <span>Mobile</span>
                            <span>Role</span>
                            <span>Last Login</span>
                          </div>
                          {orgUsers.map((u) => {
                            const uid = String(u.user_id ?? "");
                            const name = `${String(u.f_name ?? u.first_name ?? "").trim()} ${String(u.l_name ?? u.last_name ?? "").trim()}`.trim() || "—";
                            return (
                              <div key={uid} className="grid grid-cols-[40px_1fr_1fr_1fr_120px_140px] gap-2 border-b px-3 py-2 text-sm last:border-b-0">
                                <div className="flex items-center">
                                  {deletingRowIds[uid] ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.includes(uid)}
                                      onChange={() => toggleId(uid)}
                                      disabled={deleting || loadingStep || !canArchiveUsersStep}
                                      title={!canArchiveUsersStep ? ARCHIVE_USERS_NO_PERM_TITLE : undefined}
                                    />
                                  )}
                                </div>
                                <span className="truncate">{name}</span>
                                <span className="truncate text-muted-foreground">{u.email || "—"}</span>
                                <span className="truncate text-muted-foreground">{u.mobile || "—"}</span>
                                <span className="truncate text-muted-foreground">{u.role_id ? `Role ${u.role_id}` : "—"}</span>
                                <span className="truncate text-muted-foreground">{u.last_login_at || "—"}</span>
                              </div>
                            );
                          })}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {selectedIds.length} of {orgUsers.length} selected
                        </p>

                        {!canArchiveUsersStep ? (
                          <p className="text-sm text-destructive">{ARCHIVE_USERS_NO_PERM_TITLE}.</p>
                        ) : null}

                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                          {orgUsers.length} users will be soft-deleted in this step.
                        </div>

                        <div className="flex items-center justify-between">
                          <Button variant="outline" onClick={wizard.goBackStep} disabled={deleting || loadingStep || archivingAll}>
                            Back
                          </Button>
                          <div className="flex items-center gap-2">
                            {canArchiveUsersStep ? (
                              <DeleteConfirmDialog
                                title={`Archive ${selectedIds.length} user(s)?`}
                                description="These records will be hidden from all views but kept in the database for historical reporting. Restore them anytime from the Deleted Records view."
                                confirmLabel="Archive Selected"
                                loading={deleting}
                                onConfirm={performUsersDelete}
                              >
                                <Button
                                  variant="destructive"
                                  disabled={selectedIds.length === 0 || deleting || loadingStep || archivingAll}
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Soft Delete Selected
                                </Button>
                              </DeleteConfirmDialog>
                            ) : (
                              <Button variant="destructive" disabled title={ARCHIVE_USERS_NO_PERM_TITLE}>
                                <Archive className="mr-2 h-4 w-4" />
                                Soft Delete Selected
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => void performArchiveAllAndContinue()}
                              disabled={deleting || loadingStep || archivingAll || !canArchiveUsersStep}
                              title={!canArchiveUsersStep ? ARCHIVE_USERS_NO_PERM_TITLE : undefined}
                            >
                              {archivingAll ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {`Archiving ${archiveAllTotal} items...`}
                                </>
                              ) : (
                                "Archive All & Continue"
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                wizard.markStepComplete(5);
                                wizard.advanceStep();
                                await loadStepData(6);
                              }}
                              disabled={deleting || loadingStep}
                            >
                              Skip - Leave users unarchived
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      Step 6: Soft Delete Organization
                    </CardTitle>
                    <CardDescription>Archive the organization and hide it from active views.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                      Records will be hidden but preserved for historical reports. They can be restored by an administrator.
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                      <p><strong>Name:</strong> {scopeOrg?.name || state.organizationName || "—"}</p>
                      <p><strong>Contact:</strong> {scopeOrg?.details || "—"}</p>
                    </div>

                    {checkingOrgGuard ? (
                      <p className="text-sm text-muted-foreground">Checking dependencies...</p>
                    ) : orgGuardUsersCount > 0 ? (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                        <p>{orgGuardUsersCount} users are still active. You can go back to Step 5 to archive them, or archive the organization now.</p>
                        <Button
                          className="mt-3"
                          variant="outline"
                          onClick={() => wizard.goToStep(5)}
                        >
                          ← Back to Users
                        </Button>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between">
                      <Button variant="outline" onClick={wizard.goBackStep} disabled={orgDeleteBusy}>
                        Back
                      </Button>
                      <DeleteConfirmDialog
                        title="Archive Organization?"
                        description="This organization and its related records will be hidden from active views but preserved for historical reporting and can be restored."
                        confirmLabel="Archive Organization"
                        requiredText={scopeOrg?.name || state.organizationName}
                        loading={orgDeleteBusy}
                        onConfirm={handleFinalDeleteOrg}
                      >
                        <Button variant="destructive" disabled={orgDeleteBusy || !canWrite("org.name")}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive Organization
                        </Button>
                      </DeleteConfirmDialog>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-20 rounded-xl border border-amber-200 bg-card p-4 dark:border-amber-900/40">
                <h3 className="mb-3 text-sm font-semibold">Archive Summary</h3>
                <ul className="space-y-2 text-sm">
                  {summary.map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">Archived: {item.value}</span>
                    </li>
                  ))}
                </ul>
                {state.currentStep >= 1 && state.currentStep <= 5 && hasItemsRemaining[state.currentStep] ? (
                  <p className="mt-3 text-xs text-amber-700">
                    {getAllIdsForCurrentStep().length} items will remain visible until archived.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </PermissionGuard>
  );
}
