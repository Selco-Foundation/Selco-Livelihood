import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchFacilities, type FacilitySearchCriteria } from "../services/facility";
import { hasEuAccess } from "../utils/access";

export const FACILITY_SUMMARY_QUERY_KEY = "eu-facility-summary";

/**
 * Tenant-wide facility count for the overview KPI — a separate, lightweight
 * query from `useFacilities` so the KPI doesn't share a cache entry with the
 * paginated, filterable facility list.
 */
export function useFacilitySummary() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const criteria: FacilitySearchCriteria = {
    tenantId: [tenantId()],
    limit: 1,
    offset: 0,
  };

  return useQuery({
    queryKey: [FACILITY_SUMMARY_QUERY_KEY, criteria],
    enabled: Boolean(accessToken) && hasEuAccess(user?.roles),
    staleTime: 30_000,
    queryFn: async () => {
      const { total } = await searchFacilities(criteria, accessToken!, user);
      return total;
    },
  });
}
