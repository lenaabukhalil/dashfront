import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield } from "lucide-react";
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
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
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
            <CardDescription>Your account details and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center">
                <span className="text-2xl font-medium text-primary-foreground">
                  {getInitials(user.firstName, user.lastName)}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">
                  {user.firstName} {user.lastName}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className={`h-3 w-3 rounded-full ${getUserTypeColor(user.userType)}`}
                  />
                  <Badge variant="outline">
                    {getRoleDisplayName(userTypeToRole(user.userType))}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <p className="text-sm text-muted-foreground">
                    {getRoleDisplayName(userTypeToRole(user.userType))}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button variant="outline">Edit Profile</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;

