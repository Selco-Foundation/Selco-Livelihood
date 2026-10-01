import { tenantId, useAuthStore } from "@/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { searchFacilities, updateFacility, type FacilitySearchCriteria } from "../services/facility";
import { FACILITIES_QUERY_KEY } from "./use-facilities";

export const FACILITY_DETAILS_QUERY_KEY = "eu-facility-details";

/** Single-facility fetch — same `_bulk-search` endpoint as the list, scoped by `facilityIds`. */
export function useFacilityDetails(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const criteria: FacilitySearchCriteria = {
    tenantId: [tenantId()],
    limit: 1,
    offset: 0,
    facilityIds: [facilityId],
  };

  return useQuery({
    queryKey: [FACILITY_DETAILS_QUERY_KEY, facilityId],
    enabled: Boolean(accessToken) && Boolean(facilityId),
    queryFn: async () => {
      const { facilities } = await searchFacilities(criteria, accessToken!, user);
      return facilities[0];
    },
  });
}

export function useUpdateFacility(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => updateFacility(payload, accessToken!, user),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FACILITY_DETAILS_QUERY_KEY, facilityId] });
      void queryClient.invalidateQueries({ queryKey: [FACILITIES_QUERY_KEY] });
    },
  });
}
