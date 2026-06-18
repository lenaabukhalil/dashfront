import type { RbacAllowedPermission, RbacPermissionSurface } from "@/services/api";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { groupRbacPermissionsBySurface } from "@/components/rbac/rbac-shared";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface RbacPermissionSwitchesProps {
  permissions: RbacAllowedPermission[];
  switchState: Record<string, boolean>;
  onChange: (key: string, checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  excludeKeys?: string[];
}

const SURFACE_SECTIONS: {
  surface: RbacPermissionSurface;
  icon: string;
  title: string;
  subtitle: string;
  headerClassName: string;
}[] = [
  {
    surface: "dashboard",
    icon: "🖥️",
    title: "ION Dashboard",
    subtitle: "Permissions for the admin web dashboard",
    headerClassName: "border-primary/20 bg-muted/40",
  },
  {
    surface: "mobile",
    icon: "📱",
    title: "Mobile App",
    subtitle: "Permissions for the end-user mobile app",
    headerClassName: "border-violet-500/20 bg-violet-500/5 dark:bg-violet-500/10",
  },
  {
    surface: "cpo",
    icon: "🌐",
    title: "CPO Portal",
    subtitle: "Permissions for the CPO operator portal",
    headerClassName: "border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10",
  },
];

export function RbacPermissionSwitches({
  permissions,
  switchState,
  onChange,
  disabled = false,
  loading = false,
  excludeKeys = [],
}: RbacPermissionSwitchesProps) {
  const exclude = new Set(excludeKeys);
  const visible = permissions.filter((p) => !exclude.has(p.key));
  const bySurface = groupRbacPermissionsBySurface(visible);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!visible.length) {
    return <p className="text-sm text-muted-foreground">No permissions available.</p>;
  }

  return (
    <div className="space-y-4 max-h-[min(28rem,55vh)] overflow-y-auto pe-1">
      {SURFACE_SECTIONS.map(({ surface, icon, title, subtitle, headerClassName }) => {
        const groupMap = bySurface[surface];
        const categories = [...groupMap.entries()].sort(([a], [b]) => a.localeCompare(b));
        if (categories.length === 0) return null;

        const permissionCount = categories.reduce((n, [, perms]) => n + perms.length, 0);

        return (
          <Collapsible key={surface} defaultOpen className="rounded-lg border border-border overflow-hidden">
            <CollapsibleTrigger
              className={cn(
                "flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-muted/30",
                headerClassName,
                "[&[data-state=open]>svg.chevron]:rotate-180",
              )}
            >
              <span className="text-lg leading-none pt-0.5" aria-hidden>
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ({permissionCount})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              </div>
              <ChevronDown
                className="chevron h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-1"
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 py-4 space-y-5 bg-card">
              {categories.map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {category}
                  </h4>
                  <div className="divide-y rounded-lg border">
                    {perms.map((perm) => (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{perm.description}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {perm.key}
                          </p>
                        </div>
                        <Switch
                          checked={switchState[perm.key] === true}
                          onCheckedChange={(checked) => onChange(perm.key, checked)}
                          disabled={disabled}
                          aria-label={perm.description}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
