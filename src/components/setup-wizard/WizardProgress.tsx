import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

const steps = [
  { number: 1, label: "Organization" },
  { number: 2, label: "Users" },
  { number: 3, label: "Location" },
  { number: 4, label: "Charger" },
  { number: 5, label: "Connector" },
  { number: 6, label: "Tariff" },
];

export function WizardProgress({ currentStep, completedSteps, onStepClick }: WizardProgressProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const done = completedSteps.includes(step.number);
          const current = step.number === currentStep;
          const locked = step.number > 1 && !completedSteps.includes(step.number - 1);
          return (
            <div key={step.number} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => !locked && onStepClick(step.number)}
                disabled={locked}
                className={cn(
                  "flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  locked && "cursor-not-allowed text-muted-foreground/60",
                  current && "bg-primary/10 text-primary",
                  done && !current && "text-green-700",
                  !locked && !current && !done && "text-muted-foreground hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    locked && "border-muted-foreground/30 bg-muted text-muted-foreground",
                    current && "border-primary bg-primary text-primary-foreground",
                    done && "border-green-600 bg-green-600 text-white"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : locked ? <Lock className="h-3.5 w-3.5" /> : step.number}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded",
                    completedSteps.includes(step.number) ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
