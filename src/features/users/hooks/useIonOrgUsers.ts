import { useCallback, useEffect, useState } from "react";
import { listPartnerUsers } from "@/services/api";
import type { PartnerUserRecord } from "@/services/api";
import { toast } from "@/hooks/use-toast";

/** ION dashboard org scope for "ION Organization Users" tab. */
export const ION_ORGANIZATION_ID = 1;

export function useIonOrgUsers() {
  const [users, setUsers] = useState<PartnerUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPartnerUsers(ION_ORGANIZATION_ID);
      setUsers(list ?? []);
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load organization users",
        variant: "destructive",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  return { users, loading, loadUsers, ionOrganizationId: ION_ORGANIZATION_ID };
}
