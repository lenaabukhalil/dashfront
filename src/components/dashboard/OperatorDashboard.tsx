import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { useAlerts } from "@/contexts/AlertContext";
import type { PermissionCode } from "@/types/permissions";
import { 
  Zap, 
  MapPin, 
  AlertTriangle,
  Activity,
  Power
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchActiveSessions, fetchChargersStatus } from "@/services/api";
import { useEffect, useState } from "react";

export const OperatorDashboard = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { getUnacknowledgedAlerts, getAlertsBySeverity } = useAlerts();
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState<unknown[]>([]);
  const [chargerStatus, setChargerStatus] = useState({ online: 0, offline: 0 });

  useEffect(() => {
    console.log("📊 OperatorDashboard: Loading data...");
    const loadData = async () => {
      try {
        console.log("📊 OperatorDashboard: Fetching active sessions...");
        const sessions = await fetchActiveSessions();
        setActiveSessions(sessions);
        
        console.log("📊 OperatorDashboard: Fetching chargers status...");
        const status = await fetchChargersStatus();
        console.log("📊 OperatorDashboard: Status received:", status);
        setChargerStatus({
          online: status.online.length,
          offline: status.offline.length,
        });
        console.log("📊 OperatorDashboard: Charger status updated:", {
          online: status.online.length,
          offline: status.offline.length,
        });
      } catch (error) {
        console.error("❌ OperatorDashboard: Error loading data:", error);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const faultAlerts = getAlertsBySeverity("critical").concat(getAlertsBySeverity("high"));
  const unacknowledgedAlerts = getUnacknowledgedAlerts();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Active Charging Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Now</span>
                <Power className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold mt-2">{activeSessions.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chargers Online</span>
                <Zap className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold mt-2">{chargerStatus.online}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chargers Offline</span>
                <Zap className="w-4 h-4 text-destructive" />
              </div>
              <p className="text-2xl font-bold mt-2">{chargerStatus.offline}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {hasPermission("charger.status" as PermissionCode) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/chargers")}
              >
                <Zap className="w-5 h-5 mb-2" />
                <span>Chargers</span>
              </Button>
            )}
            {hasPermission("org.name" as PermissionCode) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/locations")}
              >
                <MapPin className="w-5 h-5 mb-2" />
                <span>Locations</span>
              </Button>
            )}
            {hasPermission("charger.control" as PermissionCode) && (
              <Button
                variant="outline"
                className="h-auto flex-col py-4"
                onClick={() => navigate("/chargers")}
              >
                <Power className="w-5 h-5 mb-2" />
                <span>Commands</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {faultAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Fault Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {faultAlerts.slice(0, 5).map((alert) => (
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
                        : "bg-orange-100 text-orange-800"
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
