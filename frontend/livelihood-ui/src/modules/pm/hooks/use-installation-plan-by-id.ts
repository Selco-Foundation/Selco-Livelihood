import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchInstallationPlans } from "../services/installation-plan";
import { pmKeys } from "./query-keys";

export function useInstallationPlanById(planId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: pmKeys.plan(planId),
    enabled: Boolean(planId && accessToken),
    queryFn: async () => {
      const result = await searchInstallationPlans(
        { criteria: { id: [planId!] }, limit: 1, offset: 0 },
        accessToken ?? undefined,
        user,
      );
      return result.plans[0]?.plan ?? null;
    },
  });
}
