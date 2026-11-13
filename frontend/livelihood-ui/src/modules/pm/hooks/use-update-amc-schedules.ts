import { useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAmcSchedules } from "../services/amc-schedule";
import type { AmcScheduleRow, RawAmcSchedule } from "../types/amc";
import { toRawAmcSchedules } from "../utils/amc-schedule";
import { pmKeys } from "./query-keys";

export function useUpdateAmcSchedules(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ original, rows }: { original: RawAmcSchedule[]; rows: AmcScheduleRow[] }) =>
      updateAmcSchedules(planId!, toRawAmcSchedules(original, rows), accessToken ?? undefined, user),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pmKeys.planAmcSchedules(planId) }),
  });
}
