import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchPlanActivityFacilities } from "../services/activity-facility";
import { searchAmcConfigurations } from "../services/amc-configuration";
import { toAmcBySite } from "../utils/amc-setup";
import { pmKeys } from "./query-keys";

const PAGE_LIMIT = 500;

/**
 * The running AMC (pending or active) of each solar site of a published plan, keyed by the site's
 * `facilityId`. Empty for a draft plan, which has no installation rows yet.
 */
export function usePlanAmcBySite(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.planAmcBySite(planId),
    enabled: Boolean(planId && accessToken),
    queryFn: async () => {
      const rows = await searchPlanActivityFacilities(
        { fieldPlanIds: [planId!], componentTypes: ["SOLAR"] },
        { limit: PAGE_LIMIT },
        accessToken!,
        user,
      );
      const facilities = rows.facility ?? [];
      if (facilities.length === 0) return {};
      const amcs = await searchAmcConfigurations(
        { activityFacilityIds: facilities.map((row) => row.activityFacility.id), statuses: ["PENDING_ACTIVATION", "ACTIVE"] },
        { limit: PAGE_LIMIT },
        accessToken!,
        user,
      );
      return toAmcBySite(facilities, amcs.AmcConfigurations ?? []);
    },
  });
}
