import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchFacilityAmcs } from "../services/amc";
import { toAssetAmcs } from "../utils/amc";

export const FACILITY_AMCS_QUERY_KEY = "eu-facility-amcs";

/** The running AMCs of an end user's site, so an asset row knows whether a vendor change must move its AMC. */
export function useFacilityAmcs(facilityId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: [FACILITY_AMCS_QUERY_KEY, tenantId(), facilityId],
    enabled: Boolean(accessToken) && Boolean(facilityId),
    queryFn: () => searchFacilityAmcs(facilityId, accessToken!, user),
    select: toAssetAmcs,
  });
}
