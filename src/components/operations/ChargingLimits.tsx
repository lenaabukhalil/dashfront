import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Clock, Loader2, Plug, Battery } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectOption } from "@/types";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchChargerDetails,
  saveCharger,
  fetchConnectorsByCharger,
  fetchConnectorDetails,
  saveConnector,
} from "@/services/api";

interface ChargingLimitsProps {
  chargerId?: string;
}

interface ConnectorLimitRow {
  connectorId: string;
  label: string;
  timeLimit: number;
  stopOn80: boolean;
  connectorType: string;
  status?: string;
  power?: string;
}

export const ChargingLimits = ({ chargerId: initialChargerId }: ChargingLimitsProps) => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission(role);

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCharger, setSelectedCharger] = useState<string>(initialChargerId ?? "");
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingCharger, setLoadingCharger] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingConnectors, setLoadingConnectors] = useState(false);

  const [maxSessionTime, setMaxSessionTime] = useState(120);
  const [connectorRows, setConnectorRows] = useState<ConnectorLimitRow[]>([]);
  const [saving, setSaving] = useState(false);

  const effectiveChargerId = selectedCharger || initialChargerId;

  useEffect(() => {
    let cancelled = false;
    setLoadingOrg(true);
    fetchChargerOrganizations()
      .then((opts) => { if (!cancelled) setOrgOptions(opts); })
      .catch(() => { if (!cancelled) toast({ title: "Failed to load organizations", variant: "destructive" }); })
      .finally(() => { if (!cancelled) setLoadingOrg(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedOrg) {
      setLocationOptions([]);
      setSelectedLocation("");
      setChargerOptions([]);
      setSelectedCharger("");
      return;
    }
    let cancelled = false;
    setLoadingLocation(true);
    setLocationOptions([]);
    setSelectedLocation("");
    setChargerOptions([]);
    setSelectedCharger("");
    fetchLocationsByOrg(selectedOrg)
      .then((opts) => { if (!cancelled) setLocationOptions(opts); })
      .catch(() => { if (!cancelled) toast({ title: "Failed to load locations", variant: "destructive" }); })
      .finally(() => { if (!cancelled) setLoadingLocation(false); });
    return () => { cancelled = true; };
  }, [selectedOrg]);

  useEffect(() => {
    if (!selectedLocation) {
      setChargerOptions([]);
      setSelectedCharger("");
      return;
    }
    let cancelled = false;
    setLoadingCharger(true);
    setChargerOptions([]);
    setSelectedCharger("");
    fetchChargersByLocation(selectedLocation)
      .then((opts) => { if (!cancelled) setChargerOptions(opts); })
      .catch(() => { if (!cancelled) toast({ title: "Failed to load chargers", variant: "destructive" }); })
      .finally(() => { if (!cancelled) setLoadingCharger(false); });
    return () => { cancelled = true; };
  }, [selectedLocation]);

  useEffect(() => {
    if (initialChargerId && !selectedCharger) setSelectedCharger(initialChargerId);
  }, [initialChargerId, selectedCharger]);

  useEffect(() => {
    if (!effectiveChargerId || effectiveChargerId === "__NEW_CHARGER__") return;
    let cancelled = false;
    setLoadingDetail(true);
    fetchChargerDetails(effectiveChargerId)
      .then((detail) => {
        if (cancelled || !detail) return;
        setMaxSessionTime(Number(detail.max_session_time) || 120);
      })
      .catch(() => { if (!cancelled) toast({ title: "Failed to load charger limits", variant: "destructive" }); })
      .finally(() => { if (!cancelled) setLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [effectiveChargerId]);

  useEffect(() => {
    if (!effectiveChargerId || effectiveChargerId === "__NEW_CHARGER__") {
      setConnectorRows([]);
      return;
    }
    let cancelled = false;
    setLoadingConnectors(true);
    setConnectorRows([]);
    fetchConnectorsByCharger(effectiveChargerId)
      .then(async (opts) => {
        if (cancelled || !opts.length) return;
        const rows: ConnectorLimitRow[] = [];
        for (const opt of opts) {
          const detail = await fetchConnectorDetails(opt.value);
          rows.push({
            connectorId: opt.value,
            label: opt.label || opt.value,
            timeLimit: detail?.time_limit ?? 120,
            stopOn80: !!(detail?.stop_on80),
            connectorType: detail?.connector_type ?? opt.label ?? "",
            status: detail?.status,
            power: detail?.power,
          });
        }
        if (!cancelled) setConnectorRows(rows);
      })
      .catch(() => { if (!cancelled) toast({ title: "Failed to load connectors", variant: "destructive" }); })
      .finally(() => { if (!cancelled) setLoadingConnectors(false); });
    return () => { cancelled = true; };
  }, [effectiveChargerId]);

  const updateConnectorRow = (connectorId: string, patch: Partial<ConnectorLimitRow>) => {
    setConnectorRows((prev) =>
      prev.map((r) => (r.connectorId === connectorId ? { ...r, ...patch } : r))
    );
  };

  const handleSave = async () => {
    if (!effectiveChargerId || effectiveChargerId === "__NEW_CHARGER__") {
      toast({ title: "Charger required", description: "Select Organization → Location → Charger.", variant: "destructive" });
      return;
    }
    if (!selectedLocation) {
      toast({ title: "Location required", description: "Select organization and location first.", variant: "destructive" });
      return;
    }
    if (!canWrite("charger.chargerControl")) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const detail = await fetchChargerDetails(effectiveChargerId);
      if (!detail) {
        toast({ title: "Charger not found", variant: "destructive" });
        return;
      }
      const chargerResult = await saveCharger({
        chargerId: effectiveChargerId,
        locationId: selectedLocation,
        name: detail.name ?? "",
        type: detail.type ?? "",
        status: detail.status ?? "",
        maxSessionTime,
        numConnectors: detail.num_connectors,
        description: detail.description,
      });
      if (!chargerResult.success) {
        toast({ title: "Charger save failed", description: chargerResult.message, variant: "destructive" });
        return;
      }
      for (const row of connectorRows) {
        const r = await saveConnector({
          connectorId: row.connectorId,
          chargerId: effectiveChargerId,
          connectorType: row.connectorType,
          status: row.status,
          timeLimit: row.timeLimit,
          stopOn80: row.stopOn80,
        });
        if (!r.success) toast({ title: `Connector ${row.label}`, description: r.message, variant: "destructive" });
      }
      toast({ title: "Limits saved", description: "Charger and connector limits updated." });
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Failed to save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Charging Limits</CardTitle>
        <CardDescription>
          Set maximum session time at charger level and per-connector time limit and “stop at 80%” to protect batteries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PermissionGuard role={role} permission="charger.chargerControl" action="write">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg} disabled={loadingOrg}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingOrg ? "Loading…" : "Select organization"} />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation} disabled={!selectedOrg || loadingLocation}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingLocation ? "Loading…" : "Select location"} />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Charger</Label>
              <Select value={selectedCharger} onValueChange={setSelectedCharger} disabled={!selectedLocation || loadingCharger}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCharger ? "Loading…" : "Select charger"} />
                </SelectTrigger>
                <SelectContent>
                  {chargerOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(loadingDetail || loadingConnectors) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
            </div>
          )}

          {effectiveChargerId && effectiveChargerId !== "__NEW_CHARGER__" && !loadingDetail && (
            <>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4" />
                  Charger default – maximum session time
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    max={1440}
                    value={maxSessionTime}
                    onChange={(e) => setMaxSessionTime(Number(e.target.value) || 0)}
                    disabled={!canWrite("charger.chargerControl")}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">minutes per session</span>
                </div>
              </div>

              {connectorRows.length > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Plug className="w-4 h-4" />
                    Per-connector limits
                  </div>
                  <div className="space-y-3">
                    {connectorRows.map((row) => (
                      <div
                        key={row.connectorId}
                        className="flex flex-wrap items-center gap-4 rounded border p-3 bg-background"
                      >
                        <span className="font-medium min-w-[120px]">{row.label}</span>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Time limit (min)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={1440}
                            value={row.timeLimit}
                            onChange={(e) => updateConnectorRow(row.connectorId, { timeLimit: Number(e.target.value) || 0 })}
                            disabled={!canWrite("charger.chargerControl")}
                            className="w-24"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`stop80-${row.connectorId}`}
                            checked={row.stopOn80}
                            onCheckedChange={(v) => updateConnectorRow(row.connectorId, { stopOn80: !!v })}
                            disabled={!canWrite("charger.chargerControl")}
                          />
                          <Label htmlFor={`stop80-${row.connectorId}`} className="flex items-center gap-1 text-xs cursor-pointer">
                            <Battery className="w-3 h-3" /> Stop at 80% SOC
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={saving || !selectedLocation || loadingDetail}
                className="w-full"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Saving…" : "Save all limits"}
              </Button>
            </>
          )}
        </PermissionGuard>
      </CardContent>
    </Card>
  );
};
