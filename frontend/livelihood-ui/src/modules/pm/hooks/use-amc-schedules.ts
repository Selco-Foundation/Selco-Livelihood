import { useAuthStore } from "@/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AMC_SCHEDULES_STORAGE_KEY, searchAmcSchedules } from "../services/amc-schedule";
import { pmKeys } from "./query-keys";

/** Returns the raw response; the page maps it with `toAmcScheduleRows` and keeps it for the update. */
export function useAmcSchedules(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Prototype: the static service persists to localStorage, so a save in another tab refreshes
  // this one live. Remove with the static service.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === AMC_SCHEDULES_STORAGE_KEY) {
        void queryClient.invalidateQueries({ queryKey: pmKeys.planAmcSchedules(planId) });
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [queryClient, planId]);

  return useQuery({
    queryKey: pmKeys.planAmcSchedules(planId),
    enabled: Boolean(planId && accessToken),
    queryFn: () => searchAmcSchedules(planId!, accessToken ?? undefined, user),
  });
}
