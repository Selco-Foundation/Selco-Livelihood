import { tenantId as getTenantId, useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { searchAmcConfigurations, updateAmcConfigurations, updateAmcFieldStaff } from "../services/amc-configuration";
import type { AmcScheduleRow } from "../types/amc";
import { areAmcUpdatesSaved, toAmcConfigurationUpdates, toAmcFieldStaffUpdates } from "../utils/amc-schedule";
import { waitUntilSaved } from "../utils/poll-until";
import { pmKeys } from "./query-keys";

export function useUpdateAmcSchedules(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ original, rows }: { original: AmcScheduleRow[]; rows: AmcScheduleRow[] }) => {
      const tenantId = getTenantId();
      const scheduleUpdates = toAmcConfigurationUpdates(original, rows, tenantId);
      const fieldStaffUpdates = toAmcFieldStaffUpdates(original, rows, tenantId);
      // Two all-or-nothing calls: the schedule first, then the field staff.
      if (scheduleUpdates.length > 0) await updateAmcConfigurations(scheduleUpdates, accessToken!, user);
      if (fieldStaffUpdates.length > 0) await updateAmcFieldStaff(fieldStaffUpdates, accessToken!, user);
      // Saved asynchronously: refreshing before the rows land would put the old values back on screen.
      const changedIds = new Set(scheduleUpdates.map((update) => update.id));
      const changedSites = new Set(fieldStaffUpdates.map((update) => update.activityFacilityId));
      const ids = original
        .filter((row) => changedIds.has(row.id) || changedSites.has(row.activityFacilityId))
        .map((row) => row.id);
      if (ids.length === 0) return;
      await waitUntilSaved(
        () => searchAmcConfigurations({ ids }, { limit: ids.length }, accessToken!, user),
        (found) => areAmcUpdatesSaved(found.AmcConfigurations ?? [], scheduleUpdates, fieldStaffUpdates),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmKeys.planAmcSchedules(planId) }),
  });
}
