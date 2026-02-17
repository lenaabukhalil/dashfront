import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { useAlerts } from "@/contexts/AlertContext";
import type { PermissionCode } from "@/types/permissions";
import { 
  Users, 
  Building2, 
  AlertTriangle, 
  Activity,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { getUnacknowledgedAlerts, getAlertsBySeverity } = useAlerts();
  const navigate = useNavigate();

  const criticalAlerts = getAlertsBySeverity("critical");
  const unacknowledgedAlerts = getUnacknowledgedAlerts();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {hasPermission("users.edit" as PermissionCode) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/users")}
              >
                <Users className="w-5 h-5 mb-2" />
                <span>Manage Users</span>
              </Button>
            )}
            {hasPermission("org.name" as PermissionCode) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/organizations")}
              >
                <Building2 className="w-5 h-5 mb-2" />
                <span>Organizations</span>
              </Button>
            )}
            {hasPermission("charger.status" as PermissionCode) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/monitoring")}
              >
                <Zap className="w-5 h-5 mb-2" />
                <span>Monitoring</span>
              </Button>
            )}
            {hasPermission("users.edit" as PermissionCode) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/settings")}
              >
                <Activity className="w-5 h-5 mb-2" />
                <span>Settings</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {unacknowledgedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              System-Wide Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unacknowledgedAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 border rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      alert.severity === "critical"
                        ? "bg-red-100 text-red-800"
                        : alert.severity === "high"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
