import { useCallback, useEffect, useState } from "react";
import { getRbacAllowedPermissions } from "@/services/api";
import type { RbacAllowedPermission } from "@/services/api";

export function useRbacPermissionsCatalog() {
  const [allPermissions, setAllPermissions] = useState<RbacAllowedPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRbacAllowedPermissions();
      setAllPermissions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    allPermissions,
    loading,
    error,
    reload,
  };
}
