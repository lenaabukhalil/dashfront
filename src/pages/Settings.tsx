import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import React, { useEffect, useState, useMemo } from "react";
import { PageTabs } from "@/components/shared/PageTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  FileText,
  Users,
  Shield,
  Settings as SettingsIcon,
  Download,
  Search,
  Filter,
  Edit,
  Trash2,
  Plus,
  Save,
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole, getRoleDisplayName } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { useAudit } from "@/contexts/AuditContext";
import { RBAC_MATRIX } from "@/lib/permissions";
import type { Role, PermissionKey } from "@/lib/permissions";
import type { AuditLog, AuditActionType } from "@/types/audit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const tabs = [
  { id: "general", label: "General" },
  { id: "notifications", label: "Notifications" },
  { id: "profile", label: "Profile" },
  { id: "audit", label: "Audit Log" },
  { id: "system-users", label: "System Users" },
  { id: "rbac", label: "RBAC Rules" },
];

interface SystemUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: number;
  role: Role;
  status: "active" | "inactive" | "suspended";
  lastLogin?: string;
  createdAt: string;
}

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
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  
  // Safely get audit context - handle if not available
  let auditContext;
  try {
    auditContext = useAudit();
  } catch (error) {
    console.warn("Audit context not available:", error);
    auditContext = {
      logs: [],
      getLogs: () => [],
      exportLogs: () => "[]",
    };
  }
  const { logs, getLogs, exportLogs } = auditContext;
  const { canRead, canWrite } = usePermission(role);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Profile state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: "",
  });

  // System Users state
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    userType: "1",
    status: "active",
  });

  // RBAC Rules state
  const [rbacRules, setRbacRules] = useState<RBACRule[]>([]);

  // Audit Log filters
  const [auditFilters, setAuditFilters] = useState({
    action: "all" as AuditActionType | "all",
    resource: "",
    userId: "",
    startDate: "",
    endDate: "",
    success: "all" as "true" | "false" | "all",
  });

  useEffect(() => {
    setMounted(true);
    // Load system users
    loadSystemUsers();
    // Load RBAC rules
    loadRBACRules();
  }, []);

  const loadSystemUsers = async () => {
    // API call would go here
    const mockUsers: SystemUser[] = [
      {
        id: "1",
        email: user?.email || "admin@ion.com",
        firstName: user?.firstName || "Admin",
        lastName: user?.lastName || "User",
        userType: user?.userType || 1,
        role: role || "admin",
        status: "active",
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
    setSystemUsers(mockUsers);
  };

  const loadRBACRules = () => {
    const roles: Role[] = ["admin", "manager", "engineer", "operator", "accountant"];
    const rules: RBACRule[] = roles.map((r) => {
      const permissions = Object.keys(RBAC_MATRIX[r]) as PermissionKey[];
      const readPermissions = permissions.filter(
        (p) => RBAC_MATRIX[r][p] === "R" || RBAC_MATRIX[r][p] === "RW"
      );
      const writePermissions = permissions.filter((p) => RBAC_MATRIX[r][p] === "W" || RBAC_MATRIX[r][p] === "RW");

      return {
        id: `rbac-${r}`,
        role: r,
        scope: "global",
        permissions: permissions,
        assignedUsers: systemUsers.filter((u) => u.role === r).length,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    setRbacRules(rules);
  };

  // Get filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    try {
      return getLogs({
        action: auditFilters.action !== "all" ? auditFilters.action : undefined,
        resource: auditFilters.resource || undefined,
        userId: auditFilters.userId || undefined,
        startDate: auditFilters.startDate ? new Date(auditFilters.startDate) : undefined,
        endDate: auditFilters.endDate ? new Date(auditFilters.endDate) : undefined,
        success: auditFilters.success === "true" ? true : auditFilters.success === "false" ? false : undefined,
      });
    } catch (error) {
      console.error("Error filtering audit logs:", error);
      return [];
    }
  }, [getLogs, auditFilters]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // API call would go here
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile.",
        variant: "destructive",
      });
    }
  };

  const handleUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // API call would go here
      toast({
        title: editingUser ? "User updated" : "User created",
        description: `System user ${editingUser ? "updated" : "created"} successfully.`,
      });
      setIsUserDialogOpen(false);
      setEditingUser(null);
      setUserForm({
        email: "",
        firstName: "",
        lastName: "",
        userType: "1",
        status: "active",
      });
      loadSystemUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save user.",
        variant: "destructive",
      });
    }
  };

  const handleRBACRuleUpdate = async (ruleId: string, updates: Partial<RBACRule>) => {
    try {
      // API call would go here
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

  const getActionBadge = (action: AuditActionType) => {
    const variants: Record<AuditActionType, "default" | "secondary" | "destructive" | "outline"> = {
      login: "default",
      logout: "outline",
      create: "default",
      update: "secondary",
      delete: "destructive",
      view: "outline",
      export: "secondary",
      command: "default",
      permission_change: "destructive",
      settings_change: "secondary",
    };
    return variants[action] || "outline";
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

        {activeTab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for important updates
                  </p>
                </div>
                <Switch id="email-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch id="push-notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your profile information and personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-firstname">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profile-firstname"
                        value={profileForm.firstName}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, firstName: e.target.value })
                        }
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-lastname">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profile-lastname"
                        value={profileForm.lastName}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, lastName: e.target.value })
                        }
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profile-email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, email: e.target.value })
                        }
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="profile-phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, phone: e.target.value })
                        }
                        className="pl-9"
                        placeholder="+971 50 000 0000"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "security" && (
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage security and authentication settings including password policy and 2FA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSecuritySave} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Change Password
                  </h3>
                  <div className="space-y-4 pl-6 border-l-2">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">
                        Current Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={securityForm.currentPassword}
                        onChange={(e) =>
                          setSecurityForm({ ...securityForm, currentPassword: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">
                        New Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={securityForm.newPassword}
                        onChange={(e) =>
                          setSecurityForm({ ...securityForm, newPassword: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be at least {securityForm.passwordPolicy.minLength} characters with uppercase, lowercase, numbers, and special characters
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Confirm New Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={securityForm.confirmPassword}
                        onChange={(e) =>
                          setSecurityForm({ ...securityForm, confirmPassword: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Two-Factor Authentication (2FA)
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="2fa-enabled">Enable 2FA</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch
                      id="2fa-enabled"
                      checked={securityForm.twoFactorEnabled}
                      onCheckedChange={(checked) =>
                        setSecurityForm({ ...securityForm, twoFactorEnabled: checked })
                      }
                    />
                  </div>
                  {securityForm.twoFactorEnabled && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Next steps:</strong> Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) to complete setup.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Password Policy</h3>
                  <div className="space-y-4 pl-6 border-l-2">
                    <div className="space-y-2">
                      <Label htmlFor="min-length">Minimum Length</Label>
                      <Input
                        id="min-length"
                        type="number"
                        min="6"
                        max="32"
                        value={securityForm.passwordPolicy.minLength}
                        onChange={(e) =>
                          setSecurityForm({
                            ...securityForm,
                            passwordPolicy: {
                              ...securityForm.passwordPolicy,
                              minLength: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="require-uppercase"
                          checked={securityForm.passwordPolicy.requireUppercase}
                          onCheckedChange={(checked) =>
                            setSecurityForm({
                              ...securityForm,
                              passwordPolicy: {
                                ...securityForm.passwordPolicy,
                                requireUppercase: checked,
                              },
                            })
                          }
                        />
                        <Label htmlFor="require-uppercase">Require Uppercase Letters</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="require-lowercase"
                          checked={securityForm.passwordPolicy.requireLowercase}
                          onCheckedChange={(checked) =>
                            setSecurityForm({
                              ...securityForm,
                              passwordPolicy: {
                                ...securityForm.passwordPolicy,
                                requireLowercase: checked,
                              },
                            })
                          }
                        />
                        <Label htmlFor="require-lowercase">Require Lowercase Letters</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="require-numbers"
                          checked={securityForm.passwordPolicy.requireNumbers}
                          onCheckedChange={(checked) =>
                            setSecurityForm({
                              ...securityForm,
                              passwordPolicy: {
                                ...securityForm.passwordPolicy,
                                requireNumbers: checked,
                              },
                            })
                          }
                        />
                        <Label htmlFor="require-numbers">Require Numbers</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="require-special"
                          checked={securityForm.passwordPolicy.requireSpecialChars}
                          onCheckedChange={(checked) =>
                            setSecurityForm({
                              ...securityForm,
                              passwordPolicy: {
                                ...securityForm.passwordPolicy,
                                requireSpecialChars: checked,
                              },
                            })
                          }
                        />
                        <Label htmlFor="require-special">Require Special Characters</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiration-days">Password Expiration (days)</Label>
                        <Input
                          id="expiration-days"
                          type="number"
                          min="0"
                          value={securityForm.passwordPolicy.expirationDays}
                          onChange={(e) =>
                            setSecurityForm({
                              ...securityForm,
                              passwordPolicy: {
                                ...securityForm.passwordPolicy,
                                expirationDays: Number(e.target.value),
                              },
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Set to 0 to disable password expiration
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    Save Security Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "audit" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Audit Log
                </CardTitle>
                <CardDescription>
                      Read-only log of all administrative actions and system events for security and compliance
                </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const exported = exportLogs(auditFilters.action !== "all" ? {
                        action: auditFilters.action,
                        resource: auditFilters.resource || undefined,
                        userId: auditFilters.userId || undefined,
                        startDate: auditFilters.startDate ? new Date(auditFilters.startDate) : undefined,
                        endDate: auditFilters.endDate ? new Date(auditFilters.endDate) : undefined,
                        success: auditFilters.success === "true" ? true : auditFilters.success === "false" ? false : undefined,
                      } : undefined);
                      const blob = new Blob([exported], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `audit-log-${new Date().toISOString()}.json`;
                      a.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Simple Filters: Date range + Action */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="filter-start" className="text-xs">From</Label>
                      <Input
                        id="filter-start"
                        type="date"
                        value={auditFilters.startDate}
                        onChange={(e) =>
                          setAuditFilters({ ...auditFilters, startDate: e.target.value })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filter-end" className="text-xs">To</Label>
                      <Input
                        id="filter-end"
                        type="date"
                        value={auditFilters.endDate}
                        onChange={(e) =>
                          setAuditFilters({ ...auditFilters, endDate: e.target.value })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filter-action" className="text-xs">Action</Label>
                      <Select
                        value={auditFilters.action}
                        onValueChange={(val) =>
                          setAuditFilters({ ...auditFilters, action: val as AuditActionType | "all" })
                        }
                      >
                        <SelectTrigger id="filter-action" className="h-9">
                          <SelectValue placeholder="All actions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="login">Login</SelectItem>
                          <SelectItem value="logout">Logout</SelectItem>
                          <SelectItem value="create">Create</SelectItem>
                          <SelectItem value="update">Update</SelectItem>
                          <SelectItem value="delete">Delete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {filteredAuditLogs.length === 0 ? (
                <EmptyState
                      title="No Audit Logs"
                      description="No audit log entries match your current filters. Try adjusting the filters or check back later."
                    />
                  ) : (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>IP Address</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAuditLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-xs">
                                {new Date(log.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">{log.userEmail}</p>
                                  <p className="text-xs text-muted-foreground">ID: {log.userId}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getActionBadge(log.action)}>
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm">{log.resource}</p>
                                  {log.resourceId && (
                                    <p className="text-xs text-muted-foreground">ID: {log.resourceId}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {log.ipAddress || "N/A"}
                              </TableCell>
                              <TableCell>
                                {log.success ? (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Success
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Failed
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        )}

        {activeTab === "system-users" && (
          <PermissionGuard
            role={role}
            permission="users.editUsers"
            action="write"
            fallback={
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to manage system users."
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
                  <Users className="w-5 h-5" />
                  System Users
                </CardTitle>
                <CardDescription>
                      Manage dashboard admin access and permissions for the ION Dashboard
                </CardDescription>
                  </div>
                  <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingUser(null);
                        setUserForm({
                          email: "",
                          firstName: "",
                          lastName: "",
                          userType: "1",
                          status: "active",
                        });
                      }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add System User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingUser ? "Edit System User" : "Add System User"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingUser
                            ? "Update system user information and permissions."
                            : "Create a new system user for dashboard access."}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleUserSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="user-firstname">
                              First Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="user-firstname"
                              value={userForm.firstName}
                              onChange={(e) =>
                                setUserForm({ ...userForm, firstName: e.target.value })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="user-lastname">
                              Last Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="user-lastname"
                              value={userForm.lastName}
                              onChange={(e) =>
                                setUserForm({ ...userForm, lastName: e.target.value })
                              }
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-email">
                            Email <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="user-email"
                            type="email"
                            value={userForm.email}
                            onChange={(e) =>
                              setUserForm({ ...userForm, email: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="user-type">
                              Role <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={userForm.userType}
                              onValueChange={(val) =>
                                setUserForm({ ...userForm, userType: val })
                              }
                            >
                              <SelectTrigger id="user-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Admin</SelectItem>
                                <SelectItem value="2">Manager</SelectItem>
                                <SelectItem value="3">Engineer</SelectItem>
                                <SelectItem value="4">Operator</SelectItem>
                                <SelectItem value="5">Accountant</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="user-status">Status</Label>
                            <Select
                              value={userForm.status}
                              onValueChange={(val) =>
                                setUserForm({ ...userForm, status: val as any })
                              }
                            >
                              <SelectTrigger id="user-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsUserDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingUser ? "Update User" : "Create User"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {systemUsers.length === 0 ? (
                <EmptyState
                    title="No System Users"
                    description="Create system users to grant dashboard access. Each user can be assigned a role with specific permissions."
                    action={
                      <Button onClick={() => setIsUserDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add System User
                      </Button>
                    }
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {systemUsers.map((sysUser) => (
                        <TableRow key={sysUser.id}>
                          <TableCell className="font-medium">
                            {sysUser.firstName} {sysUser.lastName}
                          </TableCell>
                          <TableCell>{sysUser.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getRoleDisplayName(sysUser.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                sysUser.status === "active"
                                  ? "default"
                                  : sysUser.status === "suspended"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {sysUser.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sysUser.lastLogin
                              ? new Date(sysUser.lastLogin).toLocaleDateString()
                              : "Never"}
                          </TableCell>
                          {/* Actions column removed as requested */}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
        )}

        {activeTab === "rbac" && (
          <PermissionGuard
            role={role}
            permission="users.editUsers"
            action="write"
            fallback={
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    title="Access Denied"
                    description="You don't have permission to view RBAC rules."
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
                  <Shield className="w-5 h-5" />
                  RBAC Rules
                </CardTitle>
                <CardDescription>
                      View and manage Role-Based Access Control rules. Changes are logged in Audit Log.
                </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {rbacRules.length === 0 ? (
                <EmptyState
                    title="No RBAC Rules"
                    description="RBAC rules define permissions for each role in the system."
                  />
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Permissions</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rbacRules.map((rule) => {
                          const rolePermissions = RBAC_MATRIX[rule.role];
                          const permissionCount = Object.keys(rolePermissions).length;
                          const readWriteCount = Object.values(rolePermissions).filter(
                            (v) => v === "RW"
                          ).length;
                          const readOnlyCount = Object.values(rolePermissions).filter(
                            (v) => v === "R"
                          ).length;
                          const noAccessCount = Object.values(rolePermissions).filter(
                            (v) => v === "-"
                          ).length;

                          return (
                            <TableRow key={rule.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-medium">
                                    {getRoleDisplayName(rule.role)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {rule.scope}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">
                                      {permissionCount} total
                                    </span>
                                    <span className="text-green-600">
                                      {readWriteCount} RW
                                    </span>
                                    <span className="text-blue-600">
                                      {readOnlyCount} R
                                    </span>
                                    <span className="text-gray-400">
                                      {noAccessCount} -
                                    </span>
                                  </div>
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                      View all permissions
                                    </summary>
                                    <div className="mt-2 space-y-1 pl-4 border-l">
                                      {Object.entries(rolePermissions).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between">
                                          <span className="font-mono text-xs">{key}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {formatPermissionValue(value)}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={rule.status === "active" ? "default" : "secondary"}
                                >
                                  {rule.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
