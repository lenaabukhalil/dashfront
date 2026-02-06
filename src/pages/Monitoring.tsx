import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageTabs } from "@/components/shared/PageTabs";
import { StatusDashboard } from "@/components/monitoring/StatusDashboard";
import { ActiveSessionsView } from "@/components/monitoring/ActiveSessionsView";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

const tabs = [
  { id: "status", label: "Status Dashboard" },
  { id: "sessions", label: "Active Sessions" },
  { id: "revenue", label: "Revenue per Operator" },
  { id: "shifts", label: "Operator Shifts" },
];

const Monitoring = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead, canWrite } = usePermission(role);
  const [activeTab, setActiveTab] = useState("status");
  const [tabLoading, setTabLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "status" || activeTab === "sessions") {
      setTabLoading(true);
    } else {
      setTabLoading(false);
    }
  }, [activeTab]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Monitoring</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Real-time monitoring of charger status and active sessions
          </p>
          <PageTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <PermissionGuard
          role={role}
          permission="charger.chargerStatus"
          action="read"
          fallback={
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  title="Access Denied"
                  description="You don't have permission to access monitoring."
                />
              </CardContent>
            </Card>
          }
        >
          {activeTab === "status" && (
            <>
              {tabLoading && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
                </Card>
              )}
              <div className={tabLoading ? "hidden" : "block"}>
                <StatusDashboard onLoadingChange={setTabLoading} />
              </div>
            </>
          )}

          {activeTab === "sessions" && (
            <>
              {tabLoading && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent>
                </Card>
              )}
              <div className={tabLoading ? "hidden" : "block"}>
                <ActiveSessionsView onLoadingChange={setTabLoading} />
              </div>
            </>
          )}
          {activeTab === "revenue" && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue per Operator</CardTitle>
                <CardDescription>
                  Filter revenue by date and location to track operator performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="revenue-date-from">From Date</Label>
                      <Input id="revenue-date-from" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="revenue-date-to">To Date</Label>
                      <Input id="revenue-date-to" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="revenue-location">Location</Label>
                      <Select>
                        <SelectTrigger id="revenue-location">
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button>Generate Report</Button>
                  <div className="mt-4">
                    <EmptyState
                      title="Revenue Report"
                      description="Revenue per operator report will be displayed here. Filter by date and location to view operator performance."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {activeTab === "shifts" && (
            <PermissionGuard
              role={role}
              permission="org.name"
              action="read"
              fallback={
                <Card>
                  <CardContent className="py-8">
                    <EmptyState
                      title="Access Denied"
                      description="You don't have permission to manage operator shifts."
                    />
                  </CardContent>
                </Card>
              }
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Partner Operator Shifts
                  </CardTitle>
                  <CardDescription>
                    Assign operators per station with shift start/end times
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="operator">Operator</Label>
                        <Select>
                          <SelectTrigger id="operator">
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="op1">Operator 1</SelectItem>
                            <SelectItem value="op2">Operator 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="station">Station</Label>
                        <Select>
                          <SelectTrigger id="station">
                            <SelectValue placeholder="Select station" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="station1">Station 1</SelectItem>
                            <SelectItem value="station2">Station 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="start-time">Shift Start Time</Label>
                        <Input id="start-time" type="time" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-time">Shift End Time</Label>
                        <Input id="end-time" type="time" />
                      </div>
                    </div>
                    <Button disabled={!canWrite("org.name")}>
                      Assign Shift
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </PermissionGuard>
          )}
        </PermissionGuard>
      </div>
    </DashboardLayout>
  );
};

export default Monitoring;
