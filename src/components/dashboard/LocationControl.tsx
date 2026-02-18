import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSelect } from "@/components/shared/AppSelect";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RotateCcw, Square, Unlock } from "lucide-react";
import {
  fetchChargerOrganizations,
  fetchLocationsByOrg,
  fetchChargersByLocation,
  fetchConnectorsByCharger,
  fetchChargerStatus,
  fetchConnectorStatus,
  sendChargerCommand,
} from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";

export const LocationControl = () => {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedCharger, setSelectedCharger] = useState<string>("");
  const [selectedConnector, setSelectedConnector] = useState<string>("");
  const [enabled, setEnabled] = useState(true);

  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([]);
  const [chargerOptions, setChargerOptions] = useState<SelectOption[]>([]);
  const [connectorOptions, setConnectorOptions] = useState<SelectOption[]>([]);

  const [chargerStatus, setChargerStatus] = useState<string>("");
  const [connectorStatus, setConnectorStatus] = useState<string>("");

  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    const loadOrgs = async () => {
      const orgs = await fetchChargerOrganizations();
      if (cancelled) return;
      setOrgOptions(orgs);
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0].value);
      }
    };
    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLocationOptions([]);
    setSelectedLocation("");
    setChargerOptions([]);
    setSelectedCharger("");
    setConnectorOptions([]);
    setSelectedConnector("");
    setChargerStatus("");
    setConnectorStatus("");

    if (!selectedOrg) return;

    const loadLocations = async () => {
      const locations = await fetchLocationsByOrg(selectedOrg);
      if (cancelled) return;
      setLocationOptions(locations);
      if (locations.length > 0) {
        setSelectedLocation(locations[0].value);
      } else {
        setSelectedLocation("");
      }
    };
    loadLocations();
    return () => {
      cancelled = true;
    };
  }, [selectedOrg]);

  useEffect(() => {
    let cancelled = false;

    setChargerOptions([]);
    setSelectedCharger("");
    setConnectorOptions([]);
    setSelectedConnector("");
    setChargerStatus("");
    setConnectorStatus("");

    if (!selectedLocation) return;

    const loadChargers = async () => {
      const chargers = await fetchChargersByLocation(selectedLocation);
      if (cancelled) return;
      setChargerOptions(chargers);
      if (chargers.length > 0) {
        setSelectedCharger(chargers[0].value);
      } else {
        setSelectedCharger("");
      }
    };
    loadChargers();
    return () => {
      cancelled = true;
    };
  }, [selectedLocation]);

  useEffect(() => {
    let cancelled = false;

    setConnectorOptions([]);
    setSelectedConnector("");
    setConnectorStatus("");

    if (!selectedCharger) return;

    const loadConnectors = async () => {
      const connectors = await fetchConnectorsByCharger(selectedCharger);
      if (cancelled) return;
      setConnectorOptions(connectors);
      if (connectors.length > 0) {
        setSelectedConnector(connectors[0].value);
      } else {
        setSelectedConnector("");
      }
    };
    loadConnectors();
    return () => {
      cancelled = true;
    };
  }, [selectedCharger]);

  useEffect(() => {
    if (!selectedCharger) {
      setChargerStatus("");
      return;
    }

    const loadStatus = async () => {
      const status = await fetchChargerStatus(selectedCharger);
      setChargerStatus(status || "");
    };
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [selectedCharger]);

  useEffect(() => {
    if (!selectedConnector) {
      setConnectorStatus("");
      return;
    }

    const loadStatus = async () => {
      const status = await fetchConnectorStatus(selectedConnector);
      setConnectorStatus(status || "");
    };
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [selectedConnector]);

  const handleCommand = async (command: "restart" | "stop" | "unlock") => {
    if (!selectedCharger) {
      toast({
        title: "Error",
        description: "Please select a charger first",
        variant: "destructive",
      });
      return;
    }

    const result = await sendChargerCommand(selectedCharger, command);
    if (result.success) {
      toast({
        title: "Success",
        description: result.message,
      });
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Organization</Label>
          <AppSelect
            options={orgOptions}
            value={selectedOrg}
            onChange={setSelectedOrg}
            placeholder="Select organization"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Location</Label>
          <AppSelect
            options={locationOptions}
            value={selectedLocation}
            onChange={setSelectedLocation}
            placeholder="Select location"
            isDisabled={!selectedOrg}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Charger</Label>
          <AppSelect
            options={chargerOptions}
            value={selectedCharger}
            onChange={setSelectedCharger}
            placeholder="Select charger"
            isDisabled={!selectedLocation}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Connector</Label>
          <AppSelect
            options={connectorOptions}
            value={selectedConnector}
            onChange={setSelectedConnector}
            placeholder="Select connector"
            isDisabled={!selectedCharger}
          />
        </div>

        {chargerStatus && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Charger Status</Label>
            <p className="text-sm font-medium">{chargerStatus}</p>
          </div>
        )}

        {connectorStatus && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Connector Status</Label>
            <p className="text-sm font-medium">{connectorStatus}</p>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleCommand("restart")}
              disabled={!selectedCharger}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Restart
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleCommand("stop")}
              disabled={!selectedCharger}
            >
              <Square className="w-3 h-3 mr-1 fill-current" />
              Stop
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleCommand("unlock")}
              disabled={!selectedCharger}
            >
              <Unlock className="w-3 h-3 mr-1" />
              Unlock
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Enable</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardContent>
    </Card>
  );
};

