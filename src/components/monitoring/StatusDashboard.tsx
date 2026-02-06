import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { fetchChargersStatus, fetchConnectorStatusCounts } from "@/services/api";
import { EmptyState } from "@/components/shared/EmptyState";

type ChargerStatus = "online" | "offline" | "available" | "busy" | "error";

interface ChargerStatusInfo {
  charger_id: string;
  name: string;
  status: ChargerStatus;
  location: string;
  last_update: string;
}

export const StatusDashboard = ({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);

  const [chargers, setChargers] = useState<ChargerStatusInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConnectorCounts, setLoadingConnectorCounts] = useState(true);
  const [connectorCounts, setConnectorCounts] = useState({
    availableConnectors: 0,
    unavailableConnectors: 0,
  });

  useEffect(() => {
    if (!canRead("charger.chargerStatus")) {
      setLoading(false);
      onLoadingChange?.(false);
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      try {
        console.log("📊 StatusDashboard: Loading charger status...");
        setLoading(true);
        setLoadingConnectorCounts(true);
        onLoadingChange?.(true);

        const [status, counts] = await Promise.all([fetchChargersStatus(), fetchConnectorStatusCounts()]);
        console.log("📊 StatusDashboard: Status received:", status);
        // Transform data to ChargerStatusInfo format
        const allChargers: ChargerStatusInfo[] = [
          ...status.online.map((c) => ({
            charger_id: c.id,
            name: c.name,
            status: "online" as ChargerStatus,
            location: c.locationId || "Unknown",
            last_update: c.time || new Date().toISOString(),
          })),
          ...status.offline.map((c) => ({
            charger_id: c.id,
            name: c.name,
            status: "offline" as ChargerStatus,
            location: c.locationId || "Unknown",
            last_update: c.time || new Date().toISOString(),
          })),
        ];
        if (!cancelled) setChargers(allChargers);

        if (!cancelled) {
          setConnectorCounts({
            availableConnectors: counts.availableConnectors ?? 0,
            unavailableConnectors: counts.unavailableConnectors ?? 0,
          });
          setLoadingConnectorCounts(false);
        }
      } catch (error) {
        console.error("Error loading charger status:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingConnectorCounts(false);
          onLoadingChange?.(false);
        }
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Refresh every 30 seconds
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [canRead, onLoadingChange]);

  const getStatusBadge = (status: ChargerStatus) => {
    const variants: Record<ChargerStatus, "default" | "secondary" | "destructive" | "outline"> = {
      online: "default",
      available: "default",
      busy: "secondary",
      offline: "outline",
      error: "destructive",
    };

    const colors: Record<ChargerStatus, string> = {
      online: "bg-green-500",
      available: "bg-blue-500",
      busy: "bg-yellow-500",
      offline: "bg-gray-500",
      error: "bg-red-500",
    };

    return (
      <Badge variant={variants[status]}>
        <div className={`w-2 h-2 rounded-full ${colors[status]} mr-2`} />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const stats = {
    total: chargers.length,
    online: chargers.filter((c) => c.status === "online" || c.status === "available").length,
    offline: chargers.filter((c) => c.status === "offline").length,
    availableConnectors: connectorCounts.availableConnectors,
    unavailableConnectors: connectorCounts.unavailableConnectors,
  };

  return (
    <PermissionGuard
      role={role}
      permission="charger.chargerStatus"
      action="read"
      fallback={
        <Card>
          <CardContent className="py-8">
            <EmptyState
              title="Access Denied"
              description="You don't have permission to view charger status."
            />
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Chargers</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Activity className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-green-600">{stats.online}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Connector</p>
                  <p className="text-2xl font-bold text-green-600">
                    {loadingConnectorCounts ? "…" : stats.availableConnectors}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.offline}</p>
                </div>
                <Activity className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unavailable Connector</p>
                  <p className="text-2xl font-bold text-red-600">
                    {loadingConnectorCounts ? "…" : stats.unavailableConnectors}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chargers List */}
        <Card>
          <CardHeader>
            <CardTitle>Charger Status</CardTitle>
            <CardDescription>
              Real-time status of all chargers and connector availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : chargers.length === 0 ? (
              <EmptyState
                title="No Chargers"
                description="No chargers found in the system."
              />
            ) : (
              <div className="space-y-2">
                {chargers.map((charger) => (
                  <div
                    key={charger.charger_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{charger.name}</p>
                        <p className="text-sm text-muted-foreground">{charger.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(charger.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(charger.last_update).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  );
};
