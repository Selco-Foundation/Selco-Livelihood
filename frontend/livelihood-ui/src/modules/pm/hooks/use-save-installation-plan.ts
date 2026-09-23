import { useAuthStore } from "@/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInstallationPlan, updateInstallationPlan } from "../services/installation-plan";
import type { InstallationPlan } from "../types/installation-plan";
import { pmKeys } from "./query-keys";

/** Creates a new installation plan, or updates an existing one when
 *  `plan.id` is already set (e.g. resuming the wizard at a later step). */
export function useSaveInstallationPlan() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (plan: InstallationPlan) =>
      plan.id
        ? updateInstallationPlan(plan, accessToken ?? undefined, user)
        : createInstallationPlan(plan, accessToken ?? undefined, user),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pmKeys.plans() });
    },
  });
}
