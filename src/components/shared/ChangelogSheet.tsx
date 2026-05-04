import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  APP_VERSION,
  CHANGELOG,
  markChangelogSeen,
  type ChangelogEntry,
} from "@/config/changelog";
import { Calendar, ChevronRight, Sparkles } from "lucide-react";

const CATEGORY_STYLES: Record<ChangelogEntry["category"], string> = {
  feature: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20",
  fix: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  improvement: "bg-amber-400/20 text-amber-800 dark:text-amber-200 border-amber-500/25",
  security: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/20",
};

const CATEGORY_LABEL: Record<ChangelogEntry["category"], string> = {
  feature: "Feature",
  fix: "Fix",
  improvement: "Improvement",
  security: "Security",
};

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString(undefined, { dateStyle: "medium" })
    : iso;
}

interface ChangelogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkedRead?: () => void;
}

export function ChangelogSheet({ open, onOpenChange, onMarkedRead }: ChangelogSheetProps) {
  const latest = CHANGELOG[0];
  const lastUpdateLabel = latest ? formatDisplayDate(latest.date) : "—";

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      markChangelogSeen();
      onMarkedRead?.();
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-border bg-card p-0 sm:max-w-lg"
      >
        <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-primary">
            <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
            <SheetTitle className="text-xl font-semibold tracking-tight">
              What&apos;s New in ION Dashboard
            </SheetTitle>
            <Badge
              variant="secondary"
              className="shrink-0 font-mono text-xs font-normal text-muted-foreground"
              aria-label={`App version ${APP_VERSION}`}
            >
              v{APP_VERSION}
            </Badge>
          </div>
          <SheetDescription className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Last update: {lastUpdateLabel}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0 px-6">
          <div className="relative py-4 pr-2">
            <div
              className="absolute left-[11px] top-3 bottom-3 w-px bg-border"
              aria-hidden
            />
            <ul className="relative space-y-4">
              {CHANGELOG.map((entry, index) => (
                <li key={entry.id} className="relative pl-8">
                  <span
                    className="absolute left-0 top-4 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-background bg-muted ring-2 ring-border"
                    aria-hidden
                  >
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </span>
                  <div
                    className={cn(
                      "rounded-xl border border-border bg-muted/30 p-4 shadow-sm transition-colors",
                      index === 0 && "ring-1 ring-primary/20 bg-primary/5",
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-semibold capitalize",
                          CATEGORY_STYLES[entry.category],
                        )}
                      >
                        {CATEGORY_LABEL[entry.category]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDisplayDate(entry.date)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-snug">
                      {entry.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {entry.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
