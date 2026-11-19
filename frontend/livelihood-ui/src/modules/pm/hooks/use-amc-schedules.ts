import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchPlanActivityFacilities } from "../services/activity-facility";
import { searchAmcConfigurations } from "../services/amc-configuration";
import type { AmcConfigurationSearchResponse } from "../types/amc";
import { pmKeys } from "./query-keys";

const PAGE_LIMIT = 500;

/**
 * The running AMCs of one installation plan: the plan's SOLAR installation rows first, then the AMCs
 * on those rows. Returns the raw response; the page maps it with `toAmcScheduleRows`.
 */
export function useAmcSchedules(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.planAmcSchedules(planId),
    enabled: Boolean(planId && accessToken),
    queryFn: async (): Promise<AmcConfigurationSearchResponse> => {
      const rows = await searchPlanActivityFacilities(
        { fieldPlanIds: [planId!], componentTypes: ["SOLAR"] },
        { limit: PAGE_LIMIT },
        accessToken!,
        user,
      );
      const activityFacilityIds = (rows.facility ?? []).map((row) => row.activityFacility.id);
      if (activityFacilityIds.length === 0) return { AmcConfigurations: [], TotalCount: 0 };
      return searchAmcConfigurations(
        { activityFacilityIds, statuses: ["PENDING_ACTIVATION", "ACTIVE"] },
        { limit: PAGE_LIMIT },
        accessToken!,
        user,
      );
    },
  });
}
