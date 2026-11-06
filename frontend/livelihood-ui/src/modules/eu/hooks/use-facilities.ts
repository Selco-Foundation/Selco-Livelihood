import { tenantId, useAuthStore, type BoundaryHierarchy } from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFacility,
  searchFacilities,
  type CreateFacilityPayload,
  type FacilitySearchCriteria,
} from "../services/facility";
import type { FacilitySearchFilters } from "../types/facility";
import { resolveFacilityBoundaryCodes } from "../utils/boundary";

export const FACILITIES_QUERY_KEY = "eu-facilities";

export function useFacilities(
  filters: FacilitySearchFilters,
  boundaryData: BoundaryHierarchy | undefined,
  pageSize: number,
  pageOffset: number,
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const boundaryCodes = resolveFacilityBoundaryCodes(filters, boundaryData);
  const criteria: FacilitySearchCriteria = {
    tenantId: [tenantId()],
    limit: pageSize,
    offset: pageOffset,
    ...(boundaryCodes ? { boundaryCodes } : {}),
  };

  return useQuery({
    queryKey: [FACILITIES_QUERY_KEY, criteria],
    enabled: Boolean(accessToken),
    queryFn: () => searchFacilities(criteria, accessToken!, user),
  });
}

export function useCreateFacility() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFacilityPayload) => createFacility(payload, accessToken!, user),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FACILITIES_QUERY_KEY] });
    },
  });
}
