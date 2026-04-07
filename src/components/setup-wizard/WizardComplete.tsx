import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WizardCompleteProps {
  summary: Array<{ label: string; value: string }>;
  onGoDashboard: () => void;
  onStartAnother: () => void;
}

export function WizardComplete({ summary, onGoDashboard, onStartAnother }: WizardCompleteProps) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <CardTitle className="text-2xl">Setup Complete! 🎉</CardTitle>
        <CardDescription>All setup steps are done successfully.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
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
            Start Another Setup
          </Button>
          <Button onClick={onGoDashboard}>Go to Dashboard</Button>
        </div>
      </CardContent>
    </Card>
  );
}
