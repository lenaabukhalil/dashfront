import { useEffect, useState } from "react";
import { fetchChargersStatus } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { Charger } from "@/types";

export function useChargerStatus(
  activeTab: string,
  canRead: (permission: string) => boolean,
  refreshKey = 0
) {
  const [offlineChargers, setOfflineChargers] = useState<Charger[]>([]);
  const [onlineChargers, setOnlineChargers] = useState<Charger[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusSearchOffline, setStatusSearchOffline] = useState("");
  const [statusSearchOnline, setStatusSearchOnline] = useState("");

  useEffect(() => {
    if (activeTab !== "status" || !canRead("charger.status")) {
      return;
    }

    const loadStatus = async () => {
      try {
        setIsLoadingStatus(true);
        const status = await fetchChargersStatus();
        setOfflineChargers(status.offline || []);
        setOnlineChargers(status.online || []);
      } catch (error) {
        console.error("Error loading charger status:", error);
        toast({
          title: "Failed to load charger status",
          description: "Could not retrieve charger status.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingStatus(false);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [activeTab, canRead, refreshKey]);

  return {
    offlineChargers,
    onlineChargers,
    isLoadingStatus,
    statusSearchOffline,
    setStatusSearchOffline,
    statusSearchOnline,
    setStatusSearchOnline,
  };
}
