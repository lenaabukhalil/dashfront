import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Battery, Clock, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { userTypeToRole } from "@/lib/rbac-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SelectOption } from "@/types";

interface ChargingLimitsProps {
  chargerId?: string;
}

export const ChargingLimits = ({ chargerId }: ChargingLimitsProps) => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission(role);

  const [maxSOC, setMaxSOC] = useState([80]); // State of Charge percentage
  const [maxSessionTime, setMaxSessionTime] = useState(120); // minutes
  const [minPower, setMinPower] = useState(0); // kW
  const [maxPower, setMaxPower] = useState(50); // kW
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!chargerId) {
      toast({
        title: "Charger required",
        description: "Please select a charger first.",
        variant: "destructive",
      });
      return;
    }

    if (!canWrite("charger.chargerControl")) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to set charging limits.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        title: "Limits saved",
        description: "Charging limits have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save limits.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Charging Limits</CardTitle>
        <CardDescription>
          Set maximum charging capacity, session time, and power limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PermissionGuard
          role={role}
          permission="charger.chargerControl"
          action="write"
        >
          {/* Maximum State of Charge (SOC) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Battery className="w-4 h-4" />
                Maximum State of Charge (SOC)
              </Label>
              <span className="text-sm font-medium">{maxSOC[0]}%</span>
            </div>
            <Slider
              value={maxSOC}
              onValueChange={setMaxSOC}
              min={50}
              max={100}
              step={1}
              disabled={!canWrite("charger.chargerControl")}
            />
            <p className="text-xs text-muted-foreground">
              Set the maximum battery charge percentage (default: 80%)
            </p>
          </div>

          {/* Maximum Session Time */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Maximum Session Time
              </Label>
              <span className="text-sm font-medium">{maxSessionTime} minutes</span>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                max="1440"
                value={maxSessionTime}
                onChange={(e) => setMaxSessionTime(Number(e.target.value))}
                disabled={!canWrite("charger.chargerControl")}
                className="flex-1"
              />
              <Select
                value="minutes"
                disabled
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum duration for a single charging session
            </p>
          </div>

          {/* Power Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Minimum Power (kW)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={minPower}
                onChange={(e) => setMinPower(Number(e.target.value))}
                disabled={!canWrite("charger.chargerControl")}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Maximum Power (kW)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={maxPower}
                onChange={(e) => setMaxPower(Number(e.target.value))}
                disabled={!canWrite("charger.chargerControl")}
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !chargerId}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Limits"}
          </Button>
        </PermissionGuard>
      </CardContent>
    </Card>
  );
};
