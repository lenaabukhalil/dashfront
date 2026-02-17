import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import React, { useEffect, useState } from "react";
import { PageTabs } from "@/components/shared/PageTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { Shield, Settings as SettingsIcon, User, Mail, Phone } from "lucide-react";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { RbacEditor } from "@/components/rbac/RbacEditor";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole, getRoleDisplayName } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfileApi } from "@/services/api";
import { RBAC_MATRIX } from "@/lib/permissions";
import type { Role, PermissionKey } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const tabs = [
  { id: "general", label: "General" },
  { id: "profile", label: "Profile" },
  { id: "rbac", label: "RBAC Rules" },
];

interface RBACRule {
  id: string;
  role: Role;
  scope: "global" | "organization" | "location";
  permissions: PermissionKey[];
  assignedUsers: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { user, refreshUser } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileAvatarError, setProfileAvatarError] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [rbacRules, setRbacRules] = useState<RBACRule[]>([]);

  useEffect(() => {
    setMounted(true);
    loadRBACRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const loadRBACRules = () => {
    const roles: Role[] = ["admin", "manager", "engineer", "operator", "accountant"];
    const rules: RBACRule[] = roles.map((r) => {
      const permissions = Object.keys(RBAC_MATRIX[r]) as PermissionKey[];
      return {
        id: `rbac-${r}`,
        role: r,
        scope: "global",
        permissions: permissions,
        assignedUsers: 0,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    setRbacRules(rules);
  };

  const handleRBACRuleUpdate = async (ruleId: string, updates: Partial<RBACRule>) => {
    try {
      setRbacRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
      );
      toast({
        title: "RBAC rule updated",
        description: "Role-based access control rule has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update RBAC rule.",
        variant: "destructive",
      });
    }
  };

  const formatPermissionValue = (value: string) => {
    switch (value) {
      case "R":
        return "Read";
      case "W":
        return "Write";
      case "RW":
        return "Read & Write";
      case "-":
        return "No Access";
      default:
        return value;
    }
  };

  useEffect(() => {
    if (user && activeTab === "profile") {
      setProfileForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
      });
    }
  }, [user, activeTab]);

  useEffect(() => {
    setProfileAvatarError(false);
  }, [user?.id, user?.avatar]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    try {
      await updateProfileApi({
        f_name: profileForm.firstName.trim(),
        l_name: profileForm.lastName.trim(),
        email: profileForm.email.trim(),
      });
      await refreshUser();
      setProfileEditing(false);
      toast({ title: "Profile updated", description: "Your profile has been updated." });
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not update profile.",
        variant: "destructive",
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const getUserTypeColor = (userType: number) => {
    switch (userType) {
      case 1: return "bg-red-500";
      case 2: return "bg-purple-500";
      case 3: return "bg-orange-500";
      case 4: return "bg-blue-500";
      case 5: return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">System Settings</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage your account settings, preferences, and system configuration
          </p>
          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {activeTab === "general" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                General Settings
              </CardTitle>
              <CardDescription>Customize the look and feel of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="theme">Theme</Label>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                {mounted && (
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger id="theme" className="w-[180px]">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "profile" && user && (
          <>
            <div>
              <h2 className="text-2xl font-bold mb-1">Profile</h2>
              <p className="text-sm text-muted-foreground mb-6">
                View and manage your profile information
              </p>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
                <CardDescription>Your account details (logged-in user)</CardDescription>
              </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-full shrink-0 overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                  {user.avatar && !profileAvatarError ? (
                    <img
                      src={user.avatar}
                      alt={user.firstName || "Profile"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => setProfileAvatarError(true)}
                    />
                  ) : (
                    <span className="text-2xl font-medium text-primary-foreground bg-primary w-full h-full flex items-center justify-center">
                      {user.firstName && user.lastName
                        ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                        : user.firstName
                          ? user.firstName.slice(0, 2).toUpperCase()
                          : user.email
                            ? user.email.slice(0, 2).toUpperCase()
                            : "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold truncate">
                    {`${user.firstName || ""} ${user.lastName || ""}`.trim() || "—"}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <div className={`h-3 w-3 rounded-full shrink-0 ${getUserTypeColor(user.userType)}`} />
                    <Badge variant="outline">
                      {getRoleDisplayName(userTypeToRole(user.userType))}
                    </Badge>
                  </div>
                </div>
              </div>

              {profileEditing ? (
                <form onSubmit={handleProfileSave} className="space-y-4 pt-6 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="settings-profile-firstName">First name</Label>
                      <Input
                        id="settings-profile-firstName"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="settings-profile-lastName">Last name</Label>
                      <Input
                        id="settings-profile-lastName"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                        placeholder="Last name"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="settings-profile-email">Email</Label>
                      <Input
                        id="settings-profile-email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="Email"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-muted-foreground">Phone (read-only)</Label>
                      <p className="text-sm font-medium">{user.mobile || user.email || "—"}</p>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-2">
                    <Button type="submit" disabled={profileSaving}>
                      {profileSaving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProfileEditing(false)}
                      disabled={profileSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="space-y-4 pt-6 border-t">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <p className="text-sm font-medium break-words">
                            {`${user.firstName || ""} ${user.lastName || ""}`.trim() || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <p className="text-sm font-medium break-all">{user.email || user.mobile || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <Label className="text-xs text-muted-foreground">Phone Number</Label>
                          <p className="text-sm font-medium break-all">{user.mobile || user.email || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <Label className="text-xs text-muted-foreground">Role</Label>
                          <p className="text-sm font-medium">
                            {getRoleDisplayName(userTypeToRole(user.userType))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button variant="outline" onClick={() => setProfileEditing(true)}>
                      Edit Profile
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </>
        )}

        {activeTab === "rbac" && (
          <PermissionGuard
            permission="users.edit"
            action="read"
            fallback={
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="Access Denied"
                    description="You need read access to users.edit to view RBAC."
                  />
                </CardContent>
              </Card>
            }
          >
            <RbacEditor />
          </PermissionGuard>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
