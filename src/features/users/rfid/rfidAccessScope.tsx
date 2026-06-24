import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RfidAccessScope, RfidUserRecord } from "@/services/api";

export function effectiveAccessScope(u: RfidUserRecord): RfidAccessScope {
  const s = u.access_scope;
  if (s === "locations" || s === "none" || s === "organization") return s;
  return "organization";
}

export function accessScopeTooltipText(u: RfidUserRecord): string {
  const names = u.allowed_locations_names != null ? String(u.allowed_locations_names).trim() : "";
  if (names) return names;
  const ids = u.allowed_locations;
  if (Array.isArray(ids) && ids.length > 0) return ids.map((n) => String(n)).join(", ");
  return "—";
}

export function AccessScopeCell({ u }: { u: RfidUserRecord }) {
  const scope = effectiveAccessScope(u);
  if (scope === "organization") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
        Whole organization
      </span>
    );
  }
  if (scope === "none") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        No access
      </span>
    );
  }
  const n = Array.isArray(u.allowed_locations) ? u.allowed_locations.length : 0;
  const label = `${n} location${n === 1 ? "" : "s"}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-pre-wrap">
        {accessScopeTooltipText(u)}
      </TooltipContent>
    </Tooltip>
  );
}
