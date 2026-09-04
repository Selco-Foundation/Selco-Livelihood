import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchInstallationPlans } from "../services/installation-plan";
import { hasIrAccess } from "../utils/access";

export interface UseInstallationPlansOptions {
  searchText?: string;
  pageOffset?: number;
  pageSize?: number;
}

export function useInstallationPlans(options: UseInstallationPlansOptions = {}) {
  const { searchText, pageOffset = 0, pageSize = 10 } = options;
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);

  const enabled = Boolean(accessToken && employeeTenantId && hasIrAccess(user?.roles));

  return useQuery({
    queryKey: ["ir-installation-plans", employeeTenantId, searchText, pageOffset, pageSize],
    enabled,
    staleTime: 30_000,
    queryFn: () =>
      searchInstallationPlans(
        employeeTenantId!,
        { searchText, offset: pageOffset, limit: pageSize },
        accessToken!,
        user,
      ),
  });
}
