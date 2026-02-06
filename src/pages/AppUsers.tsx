import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Award, Trophy, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const tabs = [
  { id: "users", label: "User Management" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "rewards", label: "Rewards Program" },
  { id: "support", label: "Customer Support" },
];

const AppUsers = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  const [activeTab, setActiveTab] = useState("users");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">ION App Users</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Manage mobile app users, leaderboards, and rewards
          </p>
          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <PermissionGuard
          role={role}
          permission="users.editUsers"
          action="read"
          fallback={
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  title="Access Denied"
                  description="You don't have permission to access app users."
                />
              </CardContent>
            </Card>
          }
        >
          {activeTab === "users" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  App User Management
                </CardTitle>
                <CardDescription>
                  Manage all ION mobile app users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="User Management"
                  description="App user management interface will be implemented here."
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "leaderboard" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Leaderboard
                </CardTitle>
                <CardDescription>
                  View user rankings, challenges, and achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="Leaderboard"
                  description="Challenges, leaderboards, and achievements to engage users will be implemented here."
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "rewards" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Rewards Program
                </CardTitle>
                <CardDescription>
                  Manage rewards and incentives for users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="Rewards Program"
                  description="Rewards program management will be implemented here."
                />
              </CardContent>
            </Card>
          )}

          {activeTab === "support" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Customer Support
                </CardTitle>
                <CardDescription>
                  Manage customer support for app users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="Customer Support"
                  description="Customer support management for app users will be implemented here."
                />
              </CardContent>
            </Card>
          )}
        </PermissionGuard>
      </div>
    </DashboardLayout>
  );
};

export default AppUsers;
