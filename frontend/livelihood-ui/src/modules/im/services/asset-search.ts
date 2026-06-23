import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { LivelihoodAsset } from "../types/facility-asset";

interface AssetSearchResponseItem {
  assetId?: string;
  tenantId?: string;
  facilityID?: string;
  boundaryCode?: string;
  assetTypeID?: string;
  name?: string;
  serialNumber?: string;
  modelNumber?: string;
  isOperational?: boolean;
}

function mapAsset(raw: AssetSearchResponseItem): LivelihoodAsset {
  return {
    assetId: raw.assetId ?? "",
    tenantId: raw.tenantId ?? "",
    facilityId: raw.facilityID ?? "",
    boundaryCode: raw.boundaryCode ?? "",
    assetTypeId: raw.assetTypeID ?? "",
    name: raw.name ?? raw.assetTypeID ?? "",
    serialNumber: raw.serialNumber,
    modelNumber: raw.modelNumber,
    isOperational: raw.isOperational,
  };
}

export async function searchAssetsForFacility(
  facilityId: string,
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
  limit = 50,
  offset = 0,
): Promise<LivelihoodAsset[]> {
  const { data } = await apiClient.post<AssetSearchResponseItem[]>(
    "/asset-registry/v1/asset/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      criteria: {
        tenantId,
        facilityID: facilityId,
      },
    },
    {
      params: { limit, offset },
    },
  );

  return (data ?? []).map(mapAsset);
}
