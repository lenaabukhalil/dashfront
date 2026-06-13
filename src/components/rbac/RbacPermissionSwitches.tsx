import type { RbacAllowedPermission } from "@/services/api";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { groupRbacPermissions } from "@/components/rbac/rbac-shared";

interface RbacPermissionSwitchesProps {
  permissions: RbacAllowedPermission[];
  switchState: Record<string, boolean>;
  onChange: (key: string, checked: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  excludeKeys?: string[];
}

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
  const grouped = groupRbacPermissions(visible);

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
    <div className="space-y-6 max-h-[min(24rem,50vh)] overflow-y-auto pe-1">
      {grouped.map(([category, perms]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {category}
          </h3>
          <div className="divide-y rounded-lg border">
            {perms.map((perm) => (
              <div
                key={perm.key}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{perm.description}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{perm.key}</p>
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
    </div>
  );
}
