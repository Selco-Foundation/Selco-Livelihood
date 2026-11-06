import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchFacilityActivities, type ActivityFacilitySearchCriteria } from "../services/activity";
import type { ActivityFilters } from "../types/activity";

export function useFacilityActivities(
  facilityBoundaryCode: string | undefined,
  filters: ActivityFilters,
  pageSize: number,
  pageOffset: number,
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const criteria: ActivityFacilitySearchCriteria = {
    tenantId: tenantId(),
    ...(facilityBoundaryCode ? { boundaryCodes: [facilityBoundaryCode] } : {}),
    ...(filters.activityCode.length > 0 ? { activityCodes: filters.activityCode } : {}),
  };

  return useQuery({
    queryKey: ["eu-facility-activities", criteria, pageSize, pageOffset],
    enabled: Boolean(accessToken) && Boolean(facilityBoundaryCode),
    queryFn: () =>
      searchFacilityActivities(criteria, { limit: pageSize, offset: pageOffset }, accessToken!, user),
  });
}
