import { memo } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}

const Tag = { h1: "h1", h2: "h2", h3: "h3" } as const;

export const SectionHeader = memo(function SectionHeader({
  title,
  description,
  className,
  as = "h2",
}: SectionHeaderProps) {
  const Comp = Tag[as];
  return (
    <div className={cn("space-y-1", className)}>
      <Comp className="text-lg font-semibold leading-tight tracking-tight text-foreground">
        {title}
      </Comp>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
});
