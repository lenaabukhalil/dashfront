import { useCallback, useEffect, useState } from "react";
import { listRfidUsers, type RfidUserRecord } from "@/services/api";
import { toast } from "@/hooks/use-toast";

export type RfidUserListFilters = {
  organizationId: string;
  status: "" | "active" | "blocked";
  q: string;
};

export function useRfidUsers() {
  const [users, setUsers] = useState<RfidUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<RfidUserListFilters>({
    organizationId: "",
    status: "",
    q: "",
  });
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => window.clearTimeout(id);
  }, [filters.q]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        organization_id?: number;
        status?: "active" | "blocked";
        q?: string;
      } = {};
      if (filters.organizationId && Number(filters.organizationId) > 0) {
        params.organization_id = Number(filters.organizationId);
      }
      if (filters.status === "active" || filters.status === "blocked") {
        params.status = filters.status;
      }
      if (debouncedQ.trim()) params.q = debouncedQ.trim();
      const list = await listRfidUsers(params);
      setUsers(list ?? []);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load RFID users",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filters.organizationId, filters.status, debouncedQ]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  return { users, loading, loadUsers, filters, setFilters };
}
