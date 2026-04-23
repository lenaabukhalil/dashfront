import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DeleteWizardCompleteProps {
  summary: Array<{ label: string; value: string }>;
  onGoDashboard: () => void;
  onStartAnother: () => void;
}

export function DeleteWizardComplete({
  summary,
  onGoDashboard,
  onStartAnother,
}: DeleteWizardCompleteProps) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <CardTitle className="text-2xl">Teardown Complete</CardTitle>
        <CardDescription>All selected resources were deleted successfully.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <p className="mb-2 text-sm font-semibold text-foreground">Deleted:</p>
          <ul className="space-y-2 text-sm">
            {summary.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onStartAnother}>
            Tear Down Another
          </Button>
          <Button onClick={onGoDashboard}>Go to Dashboard</Button>
        </div>
      </CardContent>
    </Card>
  );
}
