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
  /** The asset's own leaf boundary code — a `BOUNDARY_<boundaryCode>` lookup
   * gives its human-readable name, same localization convention as
   * district/block codes (see utils/boundary.ts's boundaryDisplayName). */
  boundaryCode?: string;
  /** The asset's product name (e.g. "Huller-Rice-3-HP-AC-150-kgs/hr") — a
   * Machine's assetTypeID isn't a fixed enum like Solar's PANEL/BATTERY/
   * INVERTER (it's sometimes the generic "MACHINE", sometimes a specific
   * product name), so `name` is what identifies the item. */
  name?: string;
  serialNumber?: string;
  /** For Machine assets, a human-readable spec string (e.g.
   * "3-HP-AC-150-kgs/hr") — verified against a real response; not
   * consistently populated (can be ""). */
  modelNumber?: string;
  brandID?: string;
  system?: string;
  /** ISO 8601 date-time string (e.g. "2026-09-11T06:31:11.917+00:00"), not
   * epoch millis — verified against a real asset-registry response. */
  warrantyStartDate?: string;
  warrantyDuration?: number;
  /** Freeform per-asset-type map. Verified real keys include `capacity`/
   * `capacityUnit`/`totalCapacity` (Solar) and `poNumber`/`invoiceNumber`/
   * `trainedEndUser` (Machine). */
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
