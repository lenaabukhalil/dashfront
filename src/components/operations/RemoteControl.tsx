import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const handleCommand = async (command: "start" | "stop" | "restart" | "unlock") => {
    if (!selectedCharger || !selectedConnector) {
      toast({
        title: "Selection required",
        description: "Please select a charger and connector.",
        variant: "destructive",
      });
      return;
    }

    if (!canWrite("charger.chargerControl")) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to control chargers.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);
      // API call would go here
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
          permission="charger.chargerControl"
          action="write"
          fallback={
            <EmptyState
              title="No Write Access"
              description="You need write permission to control chargers."
            />
          }
        >
          {/* Selection Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
                disabled={!selectedOrg}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Charger</Label>
              <Select
                value={selectedCharger}
                onValueChange={setSelectedCharger}
                disabled={!selectedLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select charger" />
                </SelectTrigger>
                <SelectContent>
                  {chargerOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Connector</Label>
              <Select
                value={selectedConnector}
                onValueChange={setSelectedConnector}
                disabled={!selectedCharger}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select connector" />
                </SelectTrigger>
                <SelectContent>
                  {connectorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Command Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
