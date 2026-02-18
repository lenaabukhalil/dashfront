import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/shared/AppSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, RotateCw, Unlock, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { EmptyState } from "@/components/shared/EmptyState";
import type { SelectOption } from "@/types";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
} from "@/services/api";

export const RemoteControl = () => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission(role);

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCharger, setSelectedCharger] = useState<string>("");
  const [selectedConnector, setSelectedConnector] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingCharger, setLoadingCharger] = useState(false);
  const [loadingConnector, setLoadingConnector] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingOrg(true);
    fetchChargerOrganizations()
      .then((opts) => {
        if (!cancelled) setOrgOptions(opts);
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Failed to load organizations", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoadingOrg(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedOrg) {
      setLocationOptions([]);
      setSelectedLocation("");
      setChargerOptions([]);
      setSelectedCharger("");
      setConnectorOptions([]);
      setSelectedConnector("");
      return;
    }
    let cancelled = false;
    setLoadingLocation(true);
    setLocationOptions([]);
    setSelectedLocation("");
    setChargerOptions([]);
    setSelectedCharger("");
    setConnectorOptions([]);
    setSelectedConnector("");
    fetchLocationsByOrg(selectedOrg)
      .then((opts) => {
        if (!cancelled) setLocationOptions(opts);
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Failed to load locations", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoadingLocation(false);
      });
    return () => { cancelled = true; };
  }, [selectedOrg]);

  useEffect(() => {
    if (!selectedLocation) {
      setChargerOptions([]);
      setSelectedCharger("");
      setConnectorOptions([]);
      setSelectedConnector("");
      return;
    }
    let cancelled = false;
    setLoadingCharger(true);
    setChargerOptions([]);
    setSelectedCharger("");
    setConnectorOptions([]);
    setSelectedConnector("");
    fetchChargersByLocation(selectedLocation)
      .then((opts) => {
        if (!cancelled) setChargerOptions(opts);
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Failed to load chargers", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoadingCharger(false);
      });
    return () => { cancelled = true; };
  }, [selectedLocation]);

  useEffect(() => {
    if (!selectedCharger) {
      setConnectorOptions([]);
      setSelectedConnector("");
      return;
    }
    let cancelled = false;
    setLoadingConnector(true);
    setConnectorOptions([]);
    setSelectedConnector("");
    fetchConnectorsByCharger(selectedCharger)
      .then((opts) => {
        if (!cancelled) setConnectorOptions(opts);
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Failed to load connectors", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setLoadingConnector(false);
      });
    return () => { cancelled = true; };
  }, [selectedCharger]);

  const handleCommand = async (command: "start" | "stop" | "restart" | "unlock") => {
    if (!selectedCharger || !selectedConnector) {
      toast({
        title: "Selection required",
        description: "Please select a charger and connector.",
        variant: "destructive",
      });
      return;
    }

    if (!canWrite("charger.control")) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to control chargers.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Command sent",
        description: `${command} command sent successfully to charger.`,
      });
    } catch (error) {
      toast({
        title: "Command failed",
        description: error instanceof Error ? error.message : "Failed to send command.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const commandButtons = [
    { command: "start" as const, label: "Start Charging", icon: Play, color: "bg-green-500" },
    { command: "stop" as const, label: "Stop Charging", icon: Square, color: "bg-red-500" },
    { command: "restart" as const, label: "Restart Charger", icon: RotateCw, color: "bg-blue-500" },
    { command: "unlock" as const, label: "Unlock Connector", icon: Unlock, color: "bg-yellow-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Remote Control</CardTitle>
        <CardDescription>
          Operate and control charging sessions remotely
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PermissionGuard
          role={role}
          permission="charger.control"
          action="write"
          fallback={
            <EmptyState
              title="No Write Access"
              description="You need write permission to control chargers."
            />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <AppSelect
                options={orgOptions}
                value={selectedOrg}
                onChange={setSelectedOrg}
                placeholder={loadingOrg ? "Loading…" : "Select organization"}
                isDisabled={loadingOrg}
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <AppSelect
                options={locationOptions}
                value={selectedLocation}
                onChange={setSelectedLocation}
                placeholder={loadingLocation ? "Loading…" : "Select location"}
                isDisabled={!selectedOrg || loadingLocation}
              />
            </div>

            <div className="space-y-2">
              <Label>Charger</Label>
              <AppSelect
                options={chargerOptions}
                value={selectedCharger}
                onChange={setSelectedCharger}
                placeholder={loadingCharger ? "Loading…" : "Select charger"}
                isDisabled={!selectedLocation || loadingCharger}
              />
            </div>

            <div className="space-y-2">
              <Label>Connector</Label>
              <AppSelect
                options={connectorOptions.map((opt) => ({ value: opt.value, label: opt.label || opt.value }))}
                value={selectedConnector}
                onChange={setSelectedConnector}
                placeholder={loadingConnector ? "Loading…" : "Select connector"}
                isDisabled={!selectedCharger || loadingConnector}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {commandButtons.map(({ command, label, icon: Icon, color }) => (
              <Button
                key={command}
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => handleCommand(command)}
                disabled={!selectedCharger || !selectedConnector || sending}
              >
                {sending ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Icon className={`w-6 h-6 ${color} text-white p-1 rounded`} />
                )}
                <span className="text-xs">{label}</span>
              </Button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Select a charger and connector, then choose a command to execute.
          </p>
        </PermissionGuard>
      </CardContent>
    </Card>
  );
};
