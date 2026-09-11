import { useQuery } from "@tanstack/react-query";
import { searchInstallationPlans } from "../services/installation-plan";

export function useInstallationPlanById(planId: string | undefined) {
  return useQuery({
    queryKey: ["pm-installation-plan", planId],
    enabled: Boolean(planId),
    queryFn: async () => {
      const result = await searchInstallationPlans({ criteria: { id: [planId!] }, limit: 1, offset: 0 });
      return result.plans[0]?.plan ?? null;
    },
  });
}
