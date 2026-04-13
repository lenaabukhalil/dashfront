import * as React from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { toast } from "@/hooks/use-toast";
import { useWizardState } from "@/hooks/useWizardState";
import { WizardProgress } from "@/components/setup-wizard/WizardProgress";
import { WizardComplete } from "@/components/setup-wizard/WizardComplete";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizations } from "@/features/organizations/hooks/useOrganizations";
import { AddOrganizationTab } from "@/features/organizations/tabs/AddOrganizationTab";
import { AddLocationForm } from "@/components/locations/AddLocationForm";
import { AddChargerTab } from "@/features/chargers/tabs/AddChargerTab";
import { ConnectorsTab } from "@/features/connectors/tabs/ConnectorsTab";
import { TariffsTab } from "@/features/tariffs/tabs/TariffsTab";
import { AppSelect } from "@/components/shared/AppSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createPartnerUserV4,
  fetchPartnerUsersByOrganization,
  fetchRbacRoles,
  type PartnerUserRecord,
  type RbacRoleRecord,
} from "@/services/api";

export default function SetupWizard() {
  const navigate = useNavigate();
  const wizard = useWizardState();
  const { state } = wizard;
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);
  const { organizations, loading: orgsLoading, refetch, removeOrganizationById } = useOrganizations(canRead);
  const [selectedCharger, setSelectedCharger] = React.useState("__NEW_CHARGER__");
  const [step2Roles, setStep2Roles] = React.useState<RbacRoleRecord[]>([]);
  const [step2ExistingUsers, setStep2ExistingUsers] = React.useState<PartnerUserRecord[]>([]);
  const [step2ExistingUsersLoading, setStep2ExistingUsersLoading] = React.useState(false);
  const [step2RolesLoading, setStep2RolesLoading] = React.useState(false);
  const [step2Mode, setStep2Mode] = React.useState<"existing" | "new">("existing");
  const [step2SavingDraft, setStep2SavingDraft] = React.useState(false);
  const [step2Assigning, setStep2Assigning] = React.useState(false);
  const [step2EditingIndex, setStep2EditingIndex] = React.useState<number | null>(null);
  const [step2Drafts, setStep2Drafts] = React.useState<
    Array<{
      first_name: string;
      last_name: string;
      mobile: string;
      email: string;
      role_id: number;
      user_type: string;
      subs_plan: string;
      language: string;
      password: string;
      is_active: boolean;
      profile_img_url: string;
      provider_user_id: string;
      firebase_messaging_token: string;
      device_id: string;
    }>
  >([]);
  const [step2Form, setStep2Form] = React.useState({
    first_name: "",
    last_name: "",
    mobile: "",
    email: "",
    role_id: 0,
    user_type: "operator",
    subs_plan: "free",
    language: "en",
    password: "",
    is_active: true,
    profile_img_url: "",
    provider_user_id: "",
    firebase_messaging_token: "",
    device_id: "",
  });

  const [summaryNames, setSummaryNames] = React.useState({
    organization: "—",
    users: "—",
    location: "—",
    charger: "—",
    connector: "—",
    tariff: "—",
  });

  const completeStep = (step: number, next = true) => {
    wizard.markStepComplete(step);
    if (next && step < 6) wizard.advanceStep();
    toast({ title: `Step ${step} complete!`, description: "Moving to next step..." });
  };

  const summaryItems = useMemo(
    () => [
      { label: "Organization", value: `${summaryNames.organization} ${state.completedSteps.includes(1) ? "✓" : ""}` },
      { label: "Users", value: `${summaryNames.users} ${state.completedSteps.includes(2) ? "✓" : ""}` },
      { label: "Location", value: `${summaryNames.location} ${state.completedSteps.includes(3) ? "✓" : ""}` },
      { label: "Charger", value: `${summaryNames.charger} ${state.completedSteps.includes(4) ? "✓" : ""}` },
      { label: "Connector", value: `${summaryNames.connector} ${state.completedSteps.includes(5) ? "✓" : ""}` },
      { label: "Tariff", value: `${summaryNames.tariff} ${state.completedSteps.includes(6) ? "✓" : ""}` },
    ],
    [summaryNames, state.completedSteps]
  );

  const completedBanner = useMemo(() => {
    const items: Array<{ label: string; value: string; done: boolean }> = [
      { label: "Organization", value: summaryNames.organization, done: state.completedSteps.includes(1) },
      { label: "Users", value: summaryNames.users, done: state.completedSteps.includes(2) },
      { label: "Location", value: summaryNames.location, done: state.completedSteps.includes(3) },
      { label: "Charger", value: summaryNames.charger, done: state.completedSteps.includes(4) },
      { label: "Connector", value: summaryNames.connector, done: state.completedSteps.includes(5) },
    ];
    return items.filter((x) => x.done);
  }, [summaryNames, state.completedSteps]);

  React.useEffect(() => {
    setStep2Drafts([]);
    setStep2ExistingUsers([]);
    setStep2Mode("existing");
    setStep2EditingIndex(null);
    setStep2Form({
      first_name: "",
      last_name: "",
      mobile: "",
      email: "",
      role_id: 0,
      user_type: "operator",
      subs_plan: "free",
      language: "en",
      password: "",
      is_active: true,
      profile_img_url: "",
      provider_user_id: "",
      firebase_messaging_token: "",
      device_id: "",
    });
  }, [state.organizationId]);

  React.useEffect(() => {
    if (state.currentStep !== 2 || !state.organizationId) return;
    let cancelled = false;
    const run = async () => {
      setStep2ExistingUsersLoading(true);
      setStep2RolesLoading(true);
      try {
        const [roles, existingUsers] = await Promise.all([
          fetchRbacRoles(),
          fetchPartnerUsersByOrganization(state.organizationId),
        ]);
        if (!cancelled) {
          setStep2Roles(roles);
          setStep2ExistingUsers(existingUsers);
          setStep2Mode(existingUsers.length > 0 ? "existing" : "new");
          if (roles.length > 0) {
            setStep2Form((prev) => ({
              ...prev,
              role_id: prev.role_id > 0 ? prev.role_id : roles[0].role_id,
            }));
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast({
            title: "Step 2",
            description: e instanceof Error ? e.message : "Failed to load users/roles",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setStep2ExistingUsersLoading(false);
          setStep2RolesLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [state.currentStep, state.organizationId]);

  const step2RoleOptions = useMemo(
    () =>
      step2Roles.map((r) => ({
        value: String(r.role_id),
        label: r.role_name,
      })),
    [step2Roles]
  );

  const resetStep2Form = () => {
    setStep2Form((prev) => ({
      ...prev,
      first_name: "",
      last_name: "",
      mobile: "",
      email: "",
      user_type: "operator",
      subs_plan: "free",
      language: "en",
      password: "",
      is_active: true,
      profile_img_url: "",
      provider_user_id: "",
      firebase_messaging_token: "",
      device_id: "",
    }));
    setStep2EditingIndex(null);
  };

  const addStep2User = () => {
    if (!state.organizationId) {
      toast({ title: "Step 2", description: "Organization is required first.", variant: "destructive" });
      return;
    }
    if (!step2Form.first_name.trim() || !step2Form.last_name.trim() || !step2Form.mobile.trim()) {
      toast({ title: "Validation", description: "First name, last name, and mobile are required.", variant: "destructive" });
      return;
    }
    if (!step2Form.role_id) {
      toast({ title: "Validation", description: "Role is required.", variant: "destructive" });
      return;
    }
    if (!step2Form.password || step2Form.password.length < 8) {
      toast({ title: "Validation", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    setStep2SavingDraft(true);
    try {
      setStep2Drafts((prev) => {
        if (step2EditingIndex != null) {
          return prev.map((d, i) => (i === step2EditingIndex ? { ...step2Form } : d));
        }
        return [...prev, { ...step2Form }];
      });
      resetStep2Form();
    } finally {
      setStep2SavingDraft(false);
    }
  };

  const removeStep2User = (idx: number) => {
    setStep2Drafts((prev) => prev.filter((_, i) => i !== idx));
    if (step2EditingIndex === idx) resetStep2Form();
  };

  const editStep2User = (idx: number) => {
    const row = step2Drafts[idx];
    if (!row) return;
    setStep2Form({ ...row });
    setStep2EditingIndex(idx);
  };

  const assignStep2Users = async (): Promise<boolean> => {
    if (!state.organizationId || step2Drafts.length === 0) return true;
    setStep2Assigning(true);
    try {
      for (const item of step2Drafts) {
        await createPartnerUserV4({
          organization_id: Number(state.organizationId),
          role_id: item.role_id,
          mobile: item.mobile,
          password: item.password,
          first_name: item.first_name,
          last_name: item.last_name,
          f_name: item.first_name,
          l_name: item.last_name,
          email: item.email || undefined,
          user_type: item.user_type || "operator",
          subs_plan: item.subs_plan || "free",
          language: item.language || "en",
          is_active: item.is_active,
          profile_img_url: item.profile_img_url || undefined,
          provider_user_id: item.provider_user_id || undefined,
          firebase_messaging_token: item.firebase_messaging_token || undefined,
          device_id: item.device_id || undefined,
        });
      }
      return true;
    } catch (e) {
      toast({
        title: "User assignment failed",
        description: e instanceof Error ? e.message : "Failed to assign users",
        variant: "destructive",
      });
      return false;
    } finally {
      setStep2Assigning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setup Wizard</h1>
          <p className="text-sm text-muted-foreground">
            Complete setup in strict order: Organization → Location → Charger → Connector → Tariff
          </p>
        </div>

        <WizardProgress
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onStepClick={wizard.goToStep}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            {wizard.allCompleted ? (
              <WizardComplete
                summary={summaryItems.map((s) => ({ label: s.label, value: s.value.replace(" ✓", "") }))}
                onGoDashboard={() => navigate("/dashboard")}
                onStartAnother={() => {
                  wizard.resetWizard();
                  setSelectedCharger("__NEW_CHARGER__");
                  setSummaryNames({
                    organization: "—",
                    users: "—",
                    location: "—",
                    charger: "—",
                    connector: "—",
                    tariff: "—",
                  });
                }}
              />
            ) : (
              <div className="space-y-4">
                {state.currentStep > 1 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Completed Context</CardTitle>
                      <CardDescription>Previously completed setup items</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {completedBanner.map((item) => (
                        <Badge key={item.label} variant="secondary">
                          ✓ {item.label}: {item.value}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {state.currentStep === 1 && (
                  <AddOrganizationTab
                    organizations={organizations}
                    loading={orgsLoading}
                    refetch={refetch}
                    removeOrganizationById={removeOrganizationById}
                    role={role}
                    wizardMode
                    onWizardSave={({ organizationId, organizationName }) => {
                      wizard.setEntityId("organizationId", organizationId);
                      setSummaryNames((p) => ({ ...p, organization: organizationName }));
                      completeStep(1);
                    }}
                  />
                )}

                {state.currentStep === 2 && (
                  <div className="space-y-4">
                    {state.organizationId ? (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Users</CardTitle>
                          <CardDescription>
                            Review existing users or add new users for this organization.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="inline-flex rounded-lg border border-border bg-muted/20 p-1">
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                step2Mode === "existing"
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              onClick={() => setStep2Mode("existing")}
                            >
                              Existing Users
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                step2Mode === "new"
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              onClick={() => setStep2Mode("new")}
                            >
                              Add New User
                            </button>
                          </div>

                          {step2Mode === "existing" ? (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Existing Users in This Organization</h4>
                              {step2ExistingUsersLoading ? (
                                <p className="text-sm text-muted-foreground">Loading existing users...</p>
                              ) : step2ExistingUsers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No existing users found.</p>
                              ) : (
                                step2ExistingUsers.map((u) => {
                                  const fullName = `${String(u.f_name ?? u.first_name ?? "").trim()} ${String(u.l_name ?? u.last_name ?? "").trim()}`.trim() || "—";
                                  const roleName =
                                    step2Roles.find((r) => r.role_id === Number(u.role_id ?? 0))?.role_name ??
                                    (u.role_id ? `Role ${u.role_id}` : "—");
                                  const active = Number(u.is_active ?? 1) !== 0;
                                  return (
                                    <div
                                      key={`existing-${u.user_id}`}
                                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{fullName}</div>
                                        <div className="text-xs text-muted-foreground truncate">{u.mobile || "—"}</div>
                                        <div className="text-xs text-muted-foreground truncate">{u.email || "—"}</div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="secondary">{roleName}</Badge>
                                        <Badge variant={active ? "default" : "outline"}>
                                          {active ? "Active" : "Inactive"}
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Organization</Label>
                              <Input
                                value={organizations.find((o) => String(o.id) === String(state.organizationId))?.name ?? String(state.organizationId)}
                                disabled
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Role</Label>
                              <AppSelect
                                options={step2RoleOptions}
                                value={step2Form.role_id ? String(step2Form.role_id) : ""}
                                onChange={(val) => setStep2Form((p) => ({ ...p, role_id: Number(val) }))}
                                placeholder={step2RolesLoading ? "Loading roles..." : "Select role"}
                                isDisabled={step2RolesLoading || step2Assigning || step2SavingDraft}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>First Name</Label>
                              <Input value={step2Form.first_name} onChange={(e) => setStep2Form((p) => ({ ...p, first_name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Last Name</Label>
                              <Input value={step2Form.last_name} onChange={(e) => setStep2Form((p) => ({ ...p, last_name: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Mobile</Label>
                              <Input value={step2Form.mobile} onChange={(e) => setStep2Form((p) => ({ ...p, mobile: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input type="email" value={step2Form.email} onChange={(e) => setStep2Form((p) => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>User Type</Label>
                              <AppSelect
                                options={[
                                  { value: "owner", label: "Owner" },
                                  { value: "admin", label: "Admin" },
                                  { value: "manager", label: "Manager" },
                                  { value: "engineer", label: "Engineer" },
                                  { value: "operator", label: "Operator" },
                                  { value: "accountant", label: "Accountant" },
                                  { value: "viewer", label: "Viewer" },
                                ]}
                                value={step2Form.user_type}
                                onChange={(val) => setStep2Form((p) => ({ ...p, user_type: val }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Subscription Plan</Label>
                              <AppSelect
                                options={[
                                  { value: "free", label: "Free" },
                                  { value: "premium", label: "Premium" },
                                ]}
                                value={step2Form.subs_plan}
                                onChange={(val) => setStep2Form((p) => ({ ...p, subs_plan: val }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Language</Label>
                              <AppSelect
                                options={[
                                  { value: "en", label: "English" },
                                  { value: "ar", label: "Arabic" },
                                ]}
                                value={step2Form.language}
                                onChange={(val) => setStep2Form((p) => ({ ...p, language: val }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Password</Label>
                              <Input
                                type="password"
                                value={step2Form.password}
                                onChange={(e) => setStep2Form((p) => ({ ...p, password: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Profile Image URL</Label>
                              <Input value={step2Form.profile_img_url} onChange={(e) => setStep2Form((p) => ({ ...p, profile_img_url: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Provider User ID</Label>
                              <Input value={step2Form.provider_user_id} onChange={(e) => setStep2Form((p) => ({ ...p, provider_user_id: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Firebase Messaging Token</Label>
                              <Input value={step2Form.firebase_messaging_token} onChange={(e) => setStep2Form((p) => ({ ...p, firebase_messaging_token: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Device ID</Label>
                              <Input value={step2Form.device_id} onChange={(e) => setStep2Form((p) => ({ ...p, device_id: e.target.value }))} />
                            </div>
                          </div>
                          )}

                          {step2Mode === "new" ? (
                          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
                            <div>
                              <Label className="text-sm">Active</Label>
                              <p className="text-xs text-muted-foreground">Enable this user account</p>
                            </div>
                            <Switch
                              checked={step2Form.is_active}
                              onCheckedChange={(checked) => setStep2Form((p) => ({ ...p, is_active: checked }))}
                            />
                          </div>
                          ) : null}

                          {step2Mode === "new" ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              onClick={addStep2User}
                              disabled={step2Assigning || step2SavingDraft || step2RolesLoading}
                            >
                              {step2EditingIndex != null ? "Update User" : "Add User"}
                            </Button>
                            {step2EditingIndex != null ? (
                              <Button type="button" variant="outline" onClick={resetStep2Form}>
                                Cancel Edit
                              </Button>
                            ) : null}
                          </div>
                          ) : null}

                          {step2Mode === "new" ? (
                            step2Drafts.length > 0 ? (
                              <div className="space-y-2">
                                {step2Drafts.map((u, idx) => {
                                  const roleName =
                                    step2Roles.find((r) => r.role_id === u.role_id)?.role_name ??
                                    `Role ${u.role_id}`;
                                  const fullName = `${u.first_name} ${u.last_name}`.trim() || "—";
                                  return (
                                    <div
                                      key={`${u.mobile}-${idx}`}
                                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{fullName}</div>
                                        <div className="text-xs text-muted-foreground truncate">{u.mobile}</div>
                                        <div className="text-xs text-muted-foreground truncate">{u.email || "—"}</div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="secondary">{roleName}</Badge>
                                        <Badge variant={u.is_active ? "default" : "outline"}>
                                          {u.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => editStep2User(idx)}
                                          aria-label="Edit user"
                                          disabled={step2Assigning}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => removeStep2User(idx)}
                                          aria-label="Remove user"
                                          disabled={step2Assigning}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No drafted users yet.</p>
                            )
                          ) : null}

                          <div className="flex items-center justify-between border-t border-border pt-4">
                            <Button
                              variant="outline"
                              type="button"
                              onClick={wizard.goBackStep}
                              disabled={step2Assigning || step2SavingDraft}
                            >
                              Back
                            </Button>
                            <Button
                              type="button"
                              disabled={step2Assigning || step2SavingDraft}
                              onClick={async () => {
                                const ok = await assignStep2Users();
                                if (!ok) return;
                                const usersSummary =
                                  step2ExistingUsers.length > 0 || step2Drafts.length > 0
                                    ? `${step2ExistingUsers.length} existing, ${step2Drafts.length} new`
                                    : "No users added";
                                setSummaryNames((p) => ({ ...p, users: usersSummary }));
                                completeStep(2);
                              }}
                            >
                              {step2Assigning ? "Assigning..." : "Save & Continue"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                )}

                {state.currentStep === 3 && (
                  <AddLocationForm
                    wizardMode
                    prefilledOrgId={state.organizationId ?? undefined}
                    onWizardBack={wizard.goBackStep}
                    onWizardSave={({ locationId, locationName }) => {
                      wizard.setEntityId("locationId", locationId);
                      setSummaryNames((p) => ({ ...p, location: locationName }));
                      completeStep(3);
                    }}
                  />
                )}

                {state.currentStep === 4 && (
                  <AddChargerTab
                    activeTab="add"
                    role={role}
                    canRead={canRead}
                    selectedCharger={selectedCharger}
                    setSelectedCharger={setSelectedCharger}
                    wizardMode
                    prefilledOrgId={state.organizationId ?? undefined}
                    prefilledLocationId={state.locationId ?? undefined}
                    onWizardBack={wizard.goBackStep}
                    onWizardSave={({ chargerId, chargerName }) => {
                      wizard.setEntityId("chargerId", chargerId);
                      setSummaryNames((p) => ({ ...p, charger: chargerName }));
                      completeStep(4);
                    }}
                  />
                )}

                {state.currentStep === 5 && (
                  <ConnectorsTab
                    activeTab="add"
                    wizardMode
                    prefilledOrgId={state.organizationId ?? undefined}
                    prefilledLocationId={state.locationId ?? undefined}
                    prefilledChargerId={state.chargerId ?? undefined}
                    onWizardBack={wizard.goBackStep}
                    onWizardSave={({ connectorId, connectorName }) => {
                      wizard.setEntityId("connectorId", connectorId);
                      setSummaryNames((p) => ({ ...p, connector: connectorName }));
                      completeStep(5);
                    }}
                  />
                )}

                {state.currentStep === 6 && (
                  <TariffsTab
                    activeTab="add"
                    wizardMode
                    prefilledOrgId={state.organizationId ?? undefined}
                    prefilledLocationId={state.locationId ?? undefined}
                    prefilledChargerId={state.chargerId ?? undefined}
                    prefilledConnectorId={state.connectorId ?? undefined}
                    onWizardBack={wizard.goBackStep}
                    onWizardSave={({ tariffId, tariffName }) => {
                      wizard.setEntityId("tariffId", tariffId || "saved");
                      setSummaryNames((p) => ({ ...p, tariff: tariffName }));
                      wizard.markStepComplete(6);
                      toast({ title: "Step 6 complete!", description: "Setup completed successfully." });
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Setup Summary</h3>
              <ul className="space-y-2 text-sm">
                {summaryItems.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
