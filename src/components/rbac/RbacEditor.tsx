import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RbacRolesSection } from "@/components/rbac/RbacRolesSection";
import { RbacUsersSection } from "@/components/rbac/RbacUsersSection";
import { cn } from "@/lib/utils";

type RbacSection = "roles" | "users";

export function RbacEditor() {
  const [section, setSection] = useState<RbacSection>("roles");

  return (
    <div className="space-y-6">
      <ToggleGroup
        type="single"
        value={section}
        onValueChange={(value) => {
          if (value === "roles" || value === "users") setSection(value);
        }}
        className="justify-start"
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="roles" aria-label="Roles section" className={cn("px-4")}>
          Roles
        </ToggleGroupItem>
        <ToggleGroupItem value="users" aria-label="Users section" className={cn("px-4")}>
          Users
        </ToggleGroupItem>
      </ToggleGroup>

      {section === "roles" ? <RbacRolesSection /> : <RbacUsersSection />}
    </div>
  );
}
