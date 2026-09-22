import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchFieldPlanTemplateSolutionIds } from "../services/installation-template";
import type { InstallationPlanTemplateEntry } from "../types/installation-plan";

/** Which of the plan's solutions already have a saved IC report template — not part of
 *  `useInstallationPlanById`'s own response, since `field_plan_template` rows live outside
 *  `field-planner`'s FieldPlan object. */
export function useInstallationPlanTemplates(fieldPlanId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery<InstallationPlanTemplateEntry[]>({
    queryKey: ["pm-installation-plan-templates", fieldPlanId],
    enabled: Boolean(fieldPlanId && accessToken),
    queryFn: async () => {
      const solutionIds = await searchFieldPlanTemplateSolutionIds(fieldPlanId!, accessToken!, user);
      return Array.from(solutionIds).map((solutionCode) => ({ solutionCode, uploaded: true }));
    },
  });
}
