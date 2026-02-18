import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsWithStatusByCharger,
  type ConnectorWithStatus,
} from "@/services/api";
import type { SelectOption } from "@/types";
import { Plug, RefreshCw } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export interface ConnectorStatusRow {
  locationName: string;
  chargerId: string;
  chargerName: string;
  connectorId: string;
  connectorType: string;
  status: string;
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const isAvailable = s === "available" || s === "online";
  const isUnavailable = s === "unavailable" || s === "offline";
  const isFaulted = s === "faulted" || s === "error";
  const isCharging = s === "charging" || s === "busy";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        isAvailable && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        isUnavailable && "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
        isFaulted && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        isCharging && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        !isAvailable && !isUnavailable && !isFaulted && !isCharging && "bg-muted text-muted-foreground"
      )}
    >
      {status || "—"}
    </span>
  );
}

export function ViewConnectorsStatusTab() {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canRead } = usePermission(role);

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);

  const [organizationId, setOrganizationId] = useState("");
  const [locationId, setLocationId] = useState("");

  const [rows, setRows] = useState<ConnectorStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!canRead?.("org.name")) return;
    const load = async () => {
      try {
        const opts = await fetchChargerOrganizations();
        setOrgOptions(opts);
        if (opts.length > 0 && !organizationId) setOrganizationId(opts[0].value);
      } catch {
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load orgs only when canRead changes
  }, [canRead]);

  useEffect(() => {
    if (!organizationId) {
      setLocationOptions([]);
      setLocationId("");
      setChargerOptions([]);
      setRows([]);
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchLocationsByOrg(organizationId);
        setLocationOptions(opts);
        if (opts.length > 0 && !locationId) setLocationId(opts[0].value);
      } catch {
        setLocationOptions([]);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load locations only when organizationId changes
  }, [organizationId]);

  useEffect(() => {
    if (!locationId) {
      setChargerOptions([]);
      setRows([]);
      return;
    }
    const load = async () => {
      try {
        const opts = await fetchChargersByLocation(locationId);
        setChargerOptions(opts);
      } catch {
        setChargerOptions([]);
      }
    };
    load();
  }, [locationId]);

  const loadConnectorsStatus = useCallback(async () => {
    if (!locationId) return;
    setError(null);
    setLoading(true);
    try {
      const locationName = locationOptions.find((o) => o.value === locationId)?.label ?? locationId;
      const chargers = await fetchChargersByLocation(locationId);
      const allRows: ConnectorStatusRow[] = [];

      for (const charger of chargers) {
        const connectors: ConnectorWithStatus[] = await fetchConnectorsWithStatusByCharger(charger.value);
        for (const c of connectors) {
          allRows.push({
            locationName,
            chargerId: charger.value,
            chargerName: charger.label,
            connectorId: c.connector_id ?? c.id ?? "",
            connectorType: c.type ?? "",
            status: c.status ?? "",
          });
        }
      }

      setRows(allRows);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [locationId, locationOptions]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            View Connectors Status
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select organization and location to see connector status per charger.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="conn-status-org">Organization</Label>
              <AppSelect
                options={orgOptions}
                value={organizationId}
                onChange={setOrganizationId}
                placeholder="Select organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conn-status-location">Location</Label>
              <AppSelect
                options={locationOptions}
                value={locationId}
                onChange={setLocationId}
                placeholder="Select location"
              />
            </div>
            <Button onClick={loadConnectorsStatus} disabled={loading || !locationId}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {loading ? "Loading…" : "Load status"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
          <Button variant="outline" size="sm" className="mt-2" onClick={loadConnectorsStatus}>
            Retry
          </Button>
        </div>
      )}

      {!error && !loading && rows.length === 0 && locationId && (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              title="No connectors"
              description="Click “Load status” to load connector status for this location, or select another location."
            />
          </CardContent>
        </Card>
      )}

      {!error && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connectors by location</CardTitle>
            <p className="text-sm text-muted-foreground">
              {rows.length} connector(s) at this location
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Charger</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Connector ID</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.chargerId}-${r.connectorId}`} className="hover:bg-muted/50 border-t border-border">
                      <td className="py-3 px-4">{r.locationName}</td>
                      <td className="py-3 px-4">{r.chargerName}</td>
                      <td className="py-3 px-4 font-mono text-xs">{r.connectorId}</td>
                      <td className="py-3 px-4">{r.connectorType || "—"}</td>
                      <td className="py-3 px-4">
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!locationId && !loading && (
        <Card>
          <CardContent className="py-8">
            <EmptyState
              title="Select a location"
              description="Choose organization and location, then click “Load status” to see connector status."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
