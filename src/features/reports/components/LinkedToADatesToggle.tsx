import { Link2, Unlink2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SideBPanelTitleProps {
  title: string;
  datesLinkedToA: boolean;
  onRelink: () => void;
}

/** Link indicator beside Side B panel title — linked (static) or unlinked (click to re-link). */
export function SideBPanelTitle({ title, datesLinkedToA, onRelink }: SideBPanelTitleProps) {
  return (
    <div className="flex items-center gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#1976D2] dark:text-primary">
        {title}
      </p>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          {datesLinkedToA ? (
            <TooltipTrigger asChild>
              <span
                className="inline-flex text-[#1976D2] dark:text-primary"
                aria-label="Dates linked to A"
              >
                <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </span>
            </TooltipTrigger>
          ) : (
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRelink}
                className="inline-flex rounded-sm text-[#757575] transition-colors hover:text-[#424242] dark:text-muted-foreground dark:hover:text-foreground"
                aria-label="Re-link dates to Side A"
              >
                <Unlink2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </button>
            </TooltipTrigger>
          )}
          <TooltipContent side="top">
            {datesLinkedToA ? "Dates linked to A" : "Click to link dates to A"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
