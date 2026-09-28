import { tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchAssets, type AssetSearchCriteria } from "../services/asset";
import type { AssetFilters } from "../types/asset";

export function useFacilityAssets(facilityId: string, filters: AssetFilters) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const criteria: AssetSearchCriteria = {
    tenantId: tenantId(),
    facilityID: facilityId,
    ...(filters.assetType.length > 0 ? { assetType: filters.assetType } : {}),
    ...(filters.serialNumber.length > 0 ? { serialNumber: filters.serialNumber } : {}),
    ...(filters.isOperational.length > 0 ? { isOperational: filters.isOperational[0] === "OPERATIONAL" } : {}),
  };

  return useQuery({
    queryKey: ["eu-facility-assets", criteria],
    enabled: Boolean(accessToken) && Boolean(facilityId),
    queryFn: () => searchAssets(criteria, { limit: 1000, offset: 0 }, accessToken!, user),
  });
}
