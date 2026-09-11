import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createInstallationPlan, updateInstallationPlan } from "../services/installation-plan";
import type { InstallationPlan } from "../types/installation-plan";

/** Creates a new installation plan, or updates an existing one when
 *  `plan.id` is already set (e.g. resuming the wizard at a later step). */
export function useSaveInstallationPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plan: InstallationPlan) => (plan.id ? updateInstallationPlan(plan) : createInstallationPlan(plan)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pm-installation-plans"] });
    },
  });
}
