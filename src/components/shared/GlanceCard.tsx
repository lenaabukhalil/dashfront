import { memo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface GlanceCardProps {
  title: string;
  value: string | number;
  unit?: string;
  delta?: string;
  loading?: boolean;
  minHeight?: number;
  className?: string;
  "aria-label"?: string;
}

const CARD_MIN_HEIGHT = 88;

export const GlanceCard = memo(function GlanceCard({
  title,
  value,
  unit,
  delta,
  loading = false,
  minHeight = CARD_MIN_HEIGHT,
  className,
  "aria-label": ariaLabel,
}: GlanceCardProps) {
  const valueLabel = ariaLabel ?? `${title}: ${value}${unit ?? ""}`.trim();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-border/80",
        "min-w-0 text-center focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
        className
      )}
      style={{ minHeight }}
      role="group"
      aria-busy={loading}
      aria-label={valueLabel}
    >
      {loading ? (
        <>
          <Skeleton className="mb-2 h-8 w-16 rounded" aria-hidden />
          <Skeleton className="h-4 w-20 rounded" aria-hidden />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {value}
            {unit != null && (
              <span className="ml-0.5 text-sm font-medium text-muted-foreground">{unit}</span>
            )}
          </p>
          {delta != null && (
            <span className="mt-0.5 text-xs text-muted-foreground" aria-hidden>
              {delta}
            </span>
          )}
          <p className="mt-1 text-xs font-medium text-muted-foreground">{title}</p>
        </>
      )}
    </div>
  );
});
