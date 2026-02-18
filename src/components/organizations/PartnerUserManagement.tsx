import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { deletePartnerUser } from "@/services/api";

interface PartnerUser {
  id?: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  mobile: string;
  email: string;
  role_id: number;
  role_name?: string;
  language: string;
}

interface PartnerUserManagementProps {
  organizationId: string;
  onUserCreated?: () => void;
  onUserUpdated?: () => void;
  onUserDeleted?: () => void;
}

const roleOptions = [
  { value: 1, label: "Admin", description: "Full system access" },
  { value: 2, label: "Manager", description: "Management access" },
  { value: 3, label: "Engineer", description: "Technical access" },
  { value: 4, label: "Operator", description: "Operational access" },
  { value: 5, label: "Accountant", description: "Financial access" },
];

const languageOptions = [
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
];

export const PartnerUserManagement = ({
  organizationId,
  onUserCreated,
  onUserUpdated,
  onUserDeleted,
}: PartnerUserManagementProps) => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission(role);

  const [users, setUsers] = useState<PartnerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PartnerUser | null>(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    mobile: "",
    email: "",
    role_id: 4, // Default to Operator
    language: "ar",
  });

  useEffect(() => {
    if (organizationId) {
      loadUsers();
    }
  }, [organizationId]);

  const loadUsers = async () => {
    setUsers([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canWrite("users.edit")) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to manage partner users.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: editingUser ? "User updated" : "User created",
        description: `Partner user ${editingUser ? "updated" : "created"} successfully.`,
      });
      
      setIsDialogOpen(false);
      resetForm();
      if (editingUser) onUserUpdated?.();
      else onUserCreated?.();
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save user.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!canWrite("users.edit")) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete users.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const result = await deletePartnerUser(userId);
      if (!result.success) {
        toast({
          title: "Delete failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "User deleted",
        description: result.message,
      });
      onUserDeleted?.();
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: PartnerUser) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      mobile: user.mobile,
      email: user.email,
      role_id: user.role_id,
      language: user.language,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      mobile: "",
      email: "",
      role_id: 4,
      language: "ar",
    });
    setEditingUser(null);
  };

  const getRoleBadge = (roleId: number) => {
    const role = roleOptions.find((r) => r.value === roleId);
    if (!role) return <Badge variant="outline">Unknown</Badge>;
    
    const variants: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
      1: "destructive",
      2: "default",
      3: "secondary",
      4: "outline",
      5: "outline",
    };
    
    return <Badge variant={variants[roleId] || "outline"}>{role.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Partner Users
            </CardTitle>
            <CardDescription>
              Manage ION partner users and their privileges
            </CardDescription>
          </div>
          <PermissionGuard role={role} permission="users.edit" action="write">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Partner User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? "Edit Partner User" : "Add Partner User"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser
                      ? "Update partner user information and privileges."
                      : "Create a new partner user for this organization."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({ ...formData, first_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">
                        Last Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({ ...formData, last_name: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobile">
                        Mobile <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="mobile"
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) =>
                          setFormData({ ...formData, mobile: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role_id">
                        Role/Privileges <span className="text-destructive">*</span>
                      </Label>
                      <AppSelect
                        options={roleOptions.map((option) => ({
                          value: String(option.value),
                          label: option.label,
                        }))}
                        value={String(formData.role_id)}
                        onChange={(value) =>
                          setFormData({ ...formData, role_id: Number(value) })
                        }
                        placeholder="Select role"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <AppSelect
                        options={languageOptions.map((o) => ({ value: o.value, label: o.label }))}
                        value={formData.language}
                        onChange={(value) =>
                          setFormData({ ...formData, language: value })
                        }
                        placeholder="Select language"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
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
          </PermissionGuard>
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No partner users found. Add your first partner user to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.mobile}</TableCell>
                  <TableCell>{getRoleBadge(user.role_id)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.language.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <PermissionGuard role={role} permission="users.edit" action="write">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.id!)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </PermissionGuard>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
