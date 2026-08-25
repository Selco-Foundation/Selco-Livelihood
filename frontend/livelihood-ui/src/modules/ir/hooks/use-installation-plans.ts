import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchInstallationPlans } from "../services/installation-plan";
import { hasIrAccess } from "../utils/access";

export function useInstallationPlans(searchText?: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);

  const enabled = Boolean(accessToken && employeeTenantId && hasIrAccess(user?.roles));

  return useQuery({
    queryKey: ["ir-installation-plans", employeeTenantId, searchText],
    enabled,
    staleTime: 30_000,
    queryFn: () =>
      searchInstallationPlans(employeeTenantId!, { searchText }, accessToken!, user),
  });
}
