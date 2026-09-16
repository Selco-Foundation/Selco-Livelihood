import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";

export interface AssetSearchDocument {
  documentType?: string;
  fileStore?: string;
}

/** One row of the `/asset-registry/v1/asset/_search` response — matches the
 * backend's `Asset` model (asset-registry service) verbatim, only the
 * fields qc's `useAsset.js` reads. */
export interface AssetSearchResponseItem {
  assetId?: string;
  assetTypeID?: string;
  serialNumber?: string;
  brandID?: string;
  system?: string;
  /** ISO 8601 date-time string (e.g. "2026-09-11T06:31:11.917+00:00"), not
   * epoch millis — verified against a real asset-registry response. */
  warrantyStartDate?: string;
  warrantyDuration?: number;
  assetDetails?: Record<string, unknown>;
  documents?: AssetSearchDocument[] | null;
}

/**
 * The one method that calls `/asset-registry/v1/asset/_search` for a single
 * facility's activity — matches qc's `AssetService.fetchAssets`, but filters
 * by `activityFacilityID` (the same criteria field qc's page derives from
 * the URL) rather than `im`'s `facilityID`. Returns exactly what the backend
 * sent back; mapping to review sections is utils/asset-mapping.ts's job.
 */
export async function searchAssetsForActivityFacility(
  activityFacilityId: string,
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
  limit = 1000,
  offset = 0,
): Promise<AssetSearchResponseItem[]> {
  const { data } = await apiClient.post<AssetSearchResponseItem[]>(
    "/asset-registry/v1/asset/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      criteria: { tenantId, activityFacilityID: activityFacilityId },
    },
    { params: { limit, offset } },
  );

  return data ?? [];
}
