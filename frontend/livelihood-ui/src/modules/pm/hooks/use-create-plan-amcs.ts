import { tenantId as getTenantId, useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { searchPlanActivityFacilities } from "../services/activity-facility";
import { createAmcConfigurations, searchAmcConfigurations } from "../services/amc-configuration";
import { useAmcOptions } from "./use-amc-options";
import { toAmcCreateRows, type AmcChoice } from "../utils/amc-setup";
import { pollUntil, waitUntilSaved } from "../utils/poll-until";
import { pmKeys } from "./query-keys";

const PAGE_LIMIT = 500;

/**
 * Turns AMC on for chosen sites of a published plan: looks up the plan's solar installation rows,
 * then creates one AMC per chosen site. The same call serves publish, the published plan's Save and
 * Edit AMC's Add AMC. Both ends are asynchronous on the server, so it waits for the plan's rows
 * (just after publish) and for the new AMCs to be searchable before the AMC views refresh.
 */
export function useCreatePlanAmcs(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { defaultFrequencyMonths, defaultYears } = useAmcOptions();

  return useMutation({
    mutationFn: async (choices: AmcChoice[]) => {
      if (choices.length === 0) return undefined;
      const rows = await pollUntil(
        () =>
          searchPlanActivityFacilities(
            { fieldPlanIds: [planId!], componentTypes: ["SOLAR"] },
            { limit: PAGE_LIMIT },
            accessToken!,
            user,
          ),
        (found) => {
          const facilityIds = new Set((found.facility ?? []).map((row) => row.activityFacility.facilityId));
          return choices.every((choice) => facilityIds.has(choice.facilityId));
        },
      );
      const configurations = toAmcCreateRows(
        rows.facility ?? [],
        choices,
        getTenantId(),
        startOfDay(new Date()).getTime(),
        { frequencyMonths: defaultFrequencyMonths, years: defaultYears },
      );
      const created = await createAmcConfigurations(configurations, accessToken!, user);
      const ids = (created.AmcConfigurations ?? []).map((amc) => amc.id);
      if (ids.length > 0) {
        await waitUntilSaved(
          () => searchAmcConfigurations({ ids }, { limit: PAGE_LIMIT }, accessToken!, user),
          (found) => (found.AmcConfigurations ?? []).length >= ids.length,
        );
      }
      return created;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pmKeys.planAmcBySite(planId) }),
        queryClient.invalidateQueries({ queryKey: pmKeys.planAmcSchedules(planId) }),
      ]),
  });
}
