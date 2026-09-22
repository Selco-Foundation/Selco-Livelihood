import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchInstallationPlans } from "../services/installation-plan";

export interface UseInstallationPlansSearchOptions {
  projectId: string | undefined;
  limit?: number;
  offset?: number;
}

export function useInstallationPlansSearch({ projectId, limit = 10, offset = 0 }: UseInstallationPlansSearchOptions) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["pm-installation-plans", projectId, limit, offset],
    enabled: Boolean(projectId),
    queryFn: () =>
      searchInstallationPlans({ criteria: { projectId }, limit, offset }, accessToken ?? undefined, user),
  });
}
