import { useEffect, useState } from "react";
import { fetchLeadershipUsers } from "@/services/api";
import type { User } from "@/types";

export function useLeadershipUsers(canRead: (permission: string) => boolean) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!!canRead("users.edit") && !canRead("rfid.edit")) {
      setLoadingUsers(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingUsers(true);
        const data = await fetchLeadershipUsers();
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  return { users, loadingUsers };
}
