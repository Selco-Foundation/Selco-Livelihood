import { tenantId as getTenantId, useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { searchPlanActivityFacilities } from "../services/activity-facility";
import { createAmcConfigurations } from "../services/amc-configuration";
import { toAmcCreateRows, type AmcChoice } from "../utils/amc-setup";
import { pmKeys } from "./query-keys";

const PAGE_LIMIT = 500;

/**
 * Turns AMC on for chosen sites of a published plan: looks up the plan's solar installation rows,
 * then creates one AMC per chosen site. The same call serves publish, the published plan's Save and
 * Edit AMC's Add AMC.
 */
export function useCreatePlanAmcs(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (choices: AmcChoice[]) => {
      if (choices.length === 0) return undefined;
      const rows = await searchPlanActivityFacilities(
        { fieldPlanIds: [planId!], componentTypes: ["SOLAR"] },
        { limit: PAGE_LIMIT },
        accessToken!,
        user,
      );
      const configurations = toAmcCreateRows(
        rows.facility ?? [],
        choices,
        getTenantId(),
        startOfDay(new Date()).getTime(),
      );
      if (configurations.length === 0) return undefined;
      return createAmcConfigurations(configurations, accessToken!, user);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pmKeys.planAmcBySite(planId) }),
        queryClient.invalidateQueries({ queryKey: pmKeys.planAmcSchedules(planId) }),
      ]),
  });
}
