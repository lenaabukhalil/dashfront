import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfileApi } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, User, Shield } from "lucide-react";
import { userTypeToRole, getRoleDisplayName } from "@/lib/rbac-helpers";

const getUserTypeColor = (userType: number) => {
  switch (userType) {
    case 1:
      return "bg-red-500"; // Admin
    case 2:
      return "bg-purple-500"; // Manager
    case 3:
      return "bg-orange-500"; // Engineer
    case 4:
      return "bg-blue-500"; // Operator
    case 5:
      return "bg-green-500"; // Accountant
    default:
      return "bg-gray-500";
  }
};

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  if (!user) {
    return null;
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—";
  const displayEmail = user.email || user.mobile || "—";
  const displayPhone = user.mobile || user.email || "—";

  const getInitials = () => {
    if (user.firstName && user.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user.firstName) return user.firstName.slice(0, 2).toUpperCase();
    if (user.lastName) return user.lastName.slice(0, 2).toUpperCase();
    if (user.email) return user.email.slice(0, 2).toUpperCase();
    if (user.mobile) return user.mobile.slice(0, 2).toUpperCase();
    return "?";
  };

  const showAvatar = user.avatar && !avatarError;
  const showInitials = !user.avatar || avatarError;

  const startEdit = () => {
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileApi({
        f_name: form.firstName.trim(),
        l_name: form.lastName.trim(),
        email: form.email.trim(),
      });
      await refreshUser();
      setEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Profile</h1>
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
                {showAvatar && (
                  <img
                    src={user.avatar}
                    alt={user.firstName || "Profile"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={() => setAvatarError(true)}
                  />
                )}
                {showInitials && (
                  <span className="text-2xl font-medium text-primary-foreground bg-primary w-full h-full flex items-center justify-center">
                    {getInitials()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold truncate">{fullName}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className={`h-3 w-3 rounded-full shrink-0 ${getUserTypeColor(user.userType)}`} />
                  <Badge variant="outline">
                    {getRoleDisplayName(userTypeToRole(user.userType))}
                  </Badge>
                </div>
              </div>
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-4 pt-6 border-t">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-firstName">First name</Label>
                    <Input
                      id="profile-firstName"
                      value={form.firstName}
                      onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-lastName">Last name</Label>
                    <Input
                      id="profile-lastName"
                      value={form.lastName}
                      onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                      placeholder="Last name"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="Email"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-muted-foreground">Phone (read-only)</Label>
                    <p className="text-sm font-medium">{displayPhone}</p>
                  </div>
                </div>
                <div className="pt-4 flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
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
                        <p className="text-sm font-medium break-words">{fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="text-sm font-medium break-all">{displayEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <Label className="text-xs text-muted-foreground">Phone Number</Label>
                        <p className="text-sm font-medium break-all">{displayPhone}</p>
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
                  <Button variant="outline" onClick={startEdit}>
                    Edit Profile
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;

