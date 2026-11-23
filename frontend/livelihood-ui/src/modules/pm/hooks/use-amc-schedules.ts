import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchPlanActivityFacilities } from "../services/activity-facility";
import { searchAmcConfigurations } from "../services/amc-configuration";
import { searchAmcVisits } from "../services/amc-visit";
import type { AmcScheduleSource } from "../types/amc";
import { RUNNING_AMC_STATUSES } from "../utils/amc-schedule";
import { pmKeys } from "./query-keys";

const PAGE_LIMIT = 500;

/**
 * Edit AMC's data: the plan's SOLAR installation rows, the AMCs on them (completed ones too, shown
 * read-only), and the visits of the running ones, whose submitted count locks the start date and
 * bounds the years. The page maps it with `toAmcScheduleRows`.
 */
export function useAmcSchedules(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.planAmcSchedules(planId),
    enabled: Boolean(planId && accessToken),
    queryFn: async (): Promise<AmcScheduleSource> => {
      const rows = await searchPlanActivityFacilities(
        { fieldPlanIds: [planId!], componentTypes: ["SOLAR"] },
        { limit: PAGE_LIMIT },
        accessToken!,
        user,
      );
      const activityFacilityIds = (rows.facility ?? []).map((row) => row.activityFacility.id);
      if (activityFacilityIds.length === 0) return { configurations: [], visits: [] };
      const amcs = await searchAmcConfigurations(
        // A turned-off AMC is inactive and the search never returns it: its site simply leaves this
        // list and can get a new AMC through Add AMC.
        { activityFacilityIds, statuses: [...RUNNING_AMC_STATUSES, "COMPLETED"] },
        { limit: PAGE_LIMIT },
        accessToken!,
        user,
      );
      const configurations = amcs.AmcConfigurations ?? [];
      const runningIds = configurations.filter((amc) => RUNNING_AMC_STATUSES.includes(amc.status)).map((amc) => amc.id);
      if (runningIds.length === 0) return { configurations, visits: [] };
      const visits = await searchAmcVisits(
        { tenantId: tenantId(), amcConfigurationIds: runningIds },
        { limit: PAGE_LIMIT },
        accessToken!,
        user,
      );
      return { configurations, visits: visits.ScheduledVisits ?? [] };
    },
  });
}
