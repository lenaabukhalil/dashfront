import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Save } from "lucide-react";
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

interface SchedulingPanelProps {
  chargerId?: string;
}

const daysOfWeek = [
  { id: 0, label: "Sunday", short: "Sun" },
  { id: 1, label: "Monday", short: "Mon" },
  { id: 2, label: "Tuesday", short: "Tue" },
  { id: 3, label: "Wednesday", short: "Wed" },
  { id: 4, label: "Thursday", short: "Thu" },
  { id: 5, label: "Friday", short: "Fri" },
  { id: 6, label: "Saturday", short: "Sat" },
];

export const SchedulingPanel = ({ chargerId }: SchedulingPanelProps) => {
  const { user } = useAuth();
  const role = user ? userTypeToRole(user.userType) : null;
  const { canWrite } = usePermission(role);

  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId)
        ? prev.filter((id) => id !== dayId)
        : [...prev, dayId]
    );
  };

  const handleSave = async () => {
    if (!chargerId) {
      toast({
        title: "Charger required",
        description: "Please select a charger first.",
        variant: "destructive",
      });
      return;
    }

    if (selectedDays.length === 0) {
      toast({
        title: "Days required",
        description: "Please select at least one day.",
        variant: "destructive",
      });
      return;
    }

    if (!canWrite("charger.schedule")) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to set schedules.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast({
        title: "Schedule saved",
        description: "Charger schedule has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save schedule.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Charger Schedule
        </CardTitle>
        <CardDescription>
          Set working hours and days for chargers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PermissionGuard
          role={role}
          permission="charger.schedule"
          action="read"
        >
          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time
              </Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!canWrite("charger.schedule")}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                End Time
              </Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!canWrite("charger.schedule")}
              />
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-2">
            <Label>Days of Week</Label>
            <div className="grid grid-cols-7 gap-2">
              {daysOfWeek.map((day) => (
                <div key={day.id} className="flex flex-col items-center gap-2">
                  <Checkbox
                    id={`day-${day.id}`}
                    checked={selectedDays.includes(day.id)}
                    onCheckedChange={() => toggleDay(day.id)}
                    disabled={!canWrite("charger.schedule")}
                  />
                  <Label
                    htmlFor={`day-${day.id}`}
                    className="text-xs cursor-pointer"
                  >
                    {day.short}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Enable Schedule</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, charger will only operate during scheduled hours
              </p>
            </div>
            <Select
              value={enabled ? "enabled" : "disabled"}
              onValueChange={(val) => setEnabled(val === "enabled")}
              disabled={!canWrite("charger.schedule")}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !chargerId || !canWrite("charger.schedule")}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Schedule"}
          </Button>
        </PermissionGuard>
      </CardContent>
    </Card>
  );
};
