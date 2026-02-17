import { useEffect, useState } from "react";
import { fetchChargerOrganizations } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { SelectOption } from "@/types";

export function useUsersOrgs() {
  const [orgOptions, setOrgOptions] = useState<SelectOption[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [initialOrgValue, setInitialOrgValue] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingOrg(true);
        const opts = await fetchChargerOrganizations();
        const list = Array.isArray(opts) ? opts : [];
        setOrgOptions(list);
        const first = list[0]?.value ?? "";
        setInitialOrgValue(first);
      } catch (error) {
        toast({
          title: "Failed to load organizations",
          description: "Could not load organizations.",
          variant: "destructive",
        });
      } finally {
        setLoadingOrg(false);
      }
    };
    load();
  }, []);

  return { orgOptions, loadingOrg, initialOrgValue };
}
