import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RbacRolesSection } from "@/components/rbac/RbacRolesSection";
import { RbacUsersSection } from "@/components/rbac/RbacUsersSection";
import { useRbacPermissionsCatalog } from "@/components/rbac/useRbacPermissionsCatalog";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

type RbacSection = "roles" | "users";

function formatTabAriaLabel(label: string, count: number | null): string {
  if (count === null) return `${label}, loading`;
  return `${label}, ${count}`;
}

function RbacTabLabel({ label, count }: { label: string; count: number | null }) {
  return (
    <>
      {label}
      <span className="ml-1 text-muted-foreground/70 group-data-[state=on]:text-primary-foreground/70">
        (
        <span
          className="tabular-nums inline-block min-w-[1.25rem] text-center"
          aria-live="polite"
        >
          {count === null ? "—" : count}
        </span>
        )
      </span>
    </>
  );
}

export function RbacEditor() {
  const [section, setSection] = useState<RbacSection>("roles");
  const [rolesCount, setRolesCount] = useState<number | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);

  const {
    allPermissions,
    loading: catalogLoading,
    error: catalogError,
    reload: reloadCatalog,
  } = useRbacPermissionsCatalog();

  return (
    <div className="space-y-6">
      {catalogError && section === "roles" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>Failed to load permissions</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{catalogError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void reloadCatalog()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <ToggleGroup
        type="single"
        value={section}
        onValueChange={(value) => {
          if (value === "roles" || value === "users") {
            setSection(value);
          }
        }}
        className="justify-start"
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem
          value="roles"
          aria-label={formatTabAriaLabel("Roles", rolesCount)}
          className={cn("group px-4")}
        >
          <RbacTabLabel label="Roles" count={rolesCount} />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="users"
          aria-label={formatTabAriaLabel("Users", usersCount)}
          className={cn("group px-4")}
        >
          <RbacTabLabel label="Users" count={usersCount} />
        </ToggleGroupItem>
      </ToggleGroup>

      <div className={section !== "roles" ? "hidden" : undefined} aria-hidden={section !== "roles"}>
        <RbacRolesSection
          allowedPermissions={allPermissions}
          permissionsLoading={catalogLoading}
          onEditableRolesCount={setRolesCount}
        />
      </div>
      <div className={section !== "users" ? "hidden" : undefined} aria-hidden={section !== "users"}>
        <RbacUsersSection onUsersCount={setUsersCount} />
      </div>
    </div>
  );
}
