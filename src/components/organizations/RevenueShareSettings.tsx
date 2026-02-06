import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RevenueShareSettingsProps {
  organizationId: string;
  currentShare?: {
    partnerPercentage: number;
    platformPercentage: number;
  };
  onSave: (share: { partnerPercentage: number; platformPercentage: number }) => Promise<void>;
  disabled?: boolean;
}

export const RevenueShareSettings = ({
  organizationId,
  currentShare,
  onSave,
  disabled = false,
}: RevenueShareSettingsProps) => {
  const [partnerPercentage, setPartnerPercentage] = useState(
    currentShare?.partnerPercentage?.toString() || "0"
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const partner = parseFloat(partnerPercentage);
    const platform = 100 - partner;

    if (isNaN(partner) || partner < 0 || partner > 100) {
      toast({
        title: "Invalid percentage",
        description: "Partner percentage must be between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await onSave({
        partnerPercentage: partner,
        platformPercentage: platform,
      });
      toast({
        title: "Revenue share updated",
        description: "Revenue share percentages have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save revenue share.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const platformPercentage = 100 - (parseFloat(partnerPercentage) || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="w-5 h-5" />
          Revenue Share Settings
        </CardTitle>
        <CardDescription>
          Set revenue sharing percentages between partner and platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="partner-percentage">Partner Percentage (%)</Label>
            <Input
              id="partner-percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={partnerPercentage}
              onChange={(e) => setPartnerPercentage(e.target.value)}
              disabled={disabled || saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform-percentage">Platform Percentage (%)</Label>
            <Input
              id="platform-percentage"
              type="number"
              value={platformPercentage.toFixed(2)}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${partnerPercentage}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground min-w-[60px] text-right">
            {partnerPercentage}% / {platformPercentage.toFixed(2)}%
          </span>
        </div>

        <Button
          onClick={handleSave}
          disabled={disabled || saving}
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Revenue Share"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Total must equal 100%. Changes will apply to future transactions.
        </p>
      </CardContent>
    </Card>
  );
};
