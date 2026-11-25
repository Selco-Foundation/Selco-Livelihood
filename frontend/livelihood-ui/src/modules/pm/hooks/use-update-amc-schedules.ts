import { tenantId as getTenantId, useAuthStore, type AmcFieldStaffResult } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAmcConfigurations, updateAmcFieldStaff } from "../services/amc-configuration";
import type { AmcScheduleRow } from "../types/amc";
import { toAmcConfigurationUpdates, toAmcFieldStaffUpdates } from "../utils/amc-schedule";
import { pmKeys } from "./query-keys";

export function useUpdateAmcSchedules(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    /** Resolves to what the server did to each AMC whose field staff changed. */
    mutationFn: async ({
      original,
      rows,
    }: {
      original: AmcScheduleRow[];
      rows: AmcScheduleRow[];
    }): Promise<AmcFieldStaffResult[]> => {
      const tenantId = getTenantId();
      const scheduleUpdates = toAmcConfigurationUpdates(original, rows, tenantId);
      const fieldStaffUpdates = toAmcFieldStaffUpdates(original, rows, tenantId);
      // Two all-or-nothing calls: the schedule first, then the field staff.
      if (scheduleUpdates.length > 0) await updateAmcConfigurations(scheduleUpdates, accessToken!, user);
      const fieldStaffResponse =
        fieldStaffUpdates.length > 0 ? await updateAmcFieldStaff(fieldStaffUpdates, accessToken!, user) : undefined;
      return fieldStaffResponse?.AmcFieldStaffUpdates ?? [];
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmKeys.planAmcSchedules(planId) }),
  });
}
