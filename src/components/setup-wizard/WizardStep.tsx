import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WizardStepProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onBack?: () => void;
  onSaveContinue: () => void;
  saveDisabled?: boolean;
  saving?: boolean;
  backDisabled?: boolean;
  saveLabel?: string;
}

export function WizardStep({
  title,
  description,
  children,
  onBack,
  onSaveContinue,
  saveDisabled,
  saving,
  backDisabled,
  saveLabel = "Save & Continue",
}: WizardStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="outline" onClick={onBack} disabled={!onBack || backDisabled}>
            Back
          </Button>
          <Button onClick={onSaveContinue} disabled={saveDisabled || saving}>
            {saving ? "Saving..." : saveLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
