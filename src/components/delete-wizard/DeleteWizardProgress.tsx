import { Building2, Check, DollarSign, Lock, MapPin, Plug, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteWizardProgressProps {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (step: number) => void;
}

const steps = [
  { number: 1, label: "Tariffs", icon: DollarSign },
  { number: 2, label: "Connectors", icon: Plug },
  { number: 3, label: "Chargers", icon: Zap },
  { number: 4, label: "Locations", icon: MapPin },
  { number: 5, label: "Users", icon: Users },
  { number: 6, label: "Organization", icon: Building2 },
];

export function DeleteWizardProgress({
  currentStep,
  completedSteps,
  onStepClick,
}: DeleteWizardProgressProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-card p-4 dark:border-amber-900/40">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
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
                  current && "bg-amber-100 text-amber-700",
                  done && !current && "text-amber-700",
                  !locked && !current && !done && "text-muted-foreground hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    locked && "border-muted-foreground/30 bg-muted text-muted-foreground",
                    current && "border-amber-500 bg-amber-500 text-white",
                    done && "border-amber-500 bg-amber-500 text-white"
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : locked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="truncate">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded",
                    completedSteps.includes(step.number) ? "bg-amber-400" : "bg-muted"
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
