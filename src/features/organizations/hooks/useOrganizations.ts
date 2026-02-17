import { useEffect, useState, useCallback } from "react";
import { fetchOrganizations } from "@/services/api";
import type { Organization } from "@/types";

export function useOrganizations(canRead: (permission: string) => boolean) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrganizations();
      setOrganizations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load organizations");
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead("org.name")) {
      setLoading(false);
      return;
    }
    loadOrganizations();
    const interval = setInterval(loadOrganizations, 60000);
    return () => clearInterval(interval);
  }, [canRead, loadOrganizations]);

  const clearError = useCallback(() => setError(null), []);

  const removeOrganizationById = useCallback((id: string | number) => {
    const idStr = String(id);
    setOrganizations((prev) => prev.filter((o) => o.id !== idStr));
  }, []);

  return { organizations, loading, error, refetch: loadOrganizations, removeOrganizationById, clearError };
}
