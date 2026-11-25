import { tenantId, useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAmcConfigurations } from "../services/amc-configuration";
import { pmKeys } from "./query-keys";

/** Turns one AMC off (`configuration/_delete`), then refreshes the plan's AMC views. */
export function useTurnOffAmc(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amcId: string) => deleteAmcConfigurations([{ tenantId: tenantId(), id: amcId }], accessToken!, user),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pmKeys.planAmcSchedules(planId) }),
        queryClient.invalidateQueries({ queryKey: pmKeys.planAmcBySite(planId) }),
      ]),
  });
}
