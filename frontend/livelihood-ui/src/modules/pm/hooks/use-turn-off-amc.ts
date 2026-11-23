import { tenantId, useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAmcConfigurations, searchAmcConfigurations } from "../services/amc-configuration";
import { waitUntilSaved } from "../utils/poll-until";
import { pmKeys } from "./query-keys";

/** Turns one AMC off (`configuration/_delete`), then refreshes the plan's AMC views. */
export function useTurnOffAmc(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amcId: string) => {
      await deleteAmcConfigurations([{ tenantId: tenantId(), id: amcId }], accessToken!, user);
      // Saved asynchronously: the search stops returning the AMC once it is off.
      await waitUntilSaved(
        () => searchAmcConfigurations({ ids: [amcId] }, {}, accessToken!, user),
        (found) => (found.AmcConfigurations ?? []).length === 0,
      );
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: pmKeys.planAmcSchedules(planId) }),
        queryClient.invalidateQueries({ queryKey: pmKeys.planAmcBySite(planId) }),
      ]),
  });
}
