import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { QC_APPROVER_ROLE, searchActivityAssignments, toInstallationPlan } from "../services/installation-plan";
import type { InstallationPlanSearchResponse } from "../types/installation-plan";
import { hasIrAccess } from "../utils/access";

export interface UseInstallationPlansOptions {
  searchText?: string;
  pageOffset?: number;
  pageSize?: number;
  fieldPlanIds?: string[];
}

export function useInstallationPlans(options: UseInstallationPlansOptions = {}) {
  const { searchText, pageOffset = 0, pageSize = 10, fieldPlanIds } = options;
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);

  const enabled = Boolean(accessToken && employeeTenantId && hasIrAccess(user?.roles));

  return useQuery({
    queryKey: ["ir-installation-plans", employeeTenantId, searchText, pageOffset, pageSize, fieldPlanIds],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<InstallationPlanSearchResponse> => {
      const data = await searchActivityAssignments(
        {
          tenantId: employeeTenantId!,
          roles: [QC_APPROVER_ROLE],
          ...(searchText ? { fieldPlanCode: searchText } : {}),
          ...(fieldPlanIds?.length ? { fieldPlanIds } : {}),
        },
        { limit: pageSize, offset: pageOffset },
        accessToken!,
        user,
      );

      return {
        plans: (data.ActivityAssignment ?? []).map(toInstallationPlan),
        totalCount: data.TotalCount ?? 0,
      };
    },
  });
}
