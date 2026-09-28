import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { FacilityAsset } from "../types/asset";

/** The `Asset` `_search` request-body criteria. Request shape (`criteria` key,
 * `facilityID` field, `limit`/`offset` as query params) matches `im`'s
 * already-proven `services/asset-search.ts` call to this same endpoint. */
export interface AssetSearchCriteria {
  tenantId: string;
  facilityID: string;
  assetType?: string[];
  serialNumber?: string[];
  isOperational?: boolean;
}

/**
 * `assetDetails` uses one generic shape across every asset type — verified
 * against a real response by both `ir`'s and `im`'s existing asset-registry
 * integrations: `{ name, capacity: "550 Wp", capacityUnit, totalCapacity }`.
 * There are no separate per-type fields like `panelCapacity`/`batteryVoltage`
 * on the current backend, and `capacity` already comes pre-formatted with its
 * unit, so there's no separate voltage field either.
 */
interface AssetDetails {
  capacity?: string;
}

export interface AssetSearchDocument {
  documentType?: string;
  fileStore?: string;
}

export interface AssetSearchResponseItem {
  assetId?: string;
  assetTypeID?: string;
  serialNumber?: string;
  modelNumber?: string;
  brandID?: string;
  system?: string;
  isOperational?: boolean;
  /** ISO 8601 date-time string, not epoch millis — verified against a real
   * asset-registry response by `ir`'s `services/asset.ts`. */
  warrantyStartDate?: string;
  warrantyDuration?: number;
  assetDetails?: AssetDetails;
  documents?: AssetSearchDocument[] | null;
}

function formatInstallationDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toFacilityAsset(row: AssetSearchResponseItem): FacilityAsset {
  return {
    assetId: row.assetId ?? "",
    assetType: row.assetTypeID ?? "",
    serialNumber: row.serialNumber,
    modelNumber: row.modelNumber,
    brand: row.brandID,
    capacity: row.assetDetails?.capacity,
    installationDate: formatInstallationDate(row.warrantyStartDate),
    isOperational: row.isOperational,
  };
}

export async function searchAssets(
  criteria: AssetSearchCriteria,
  options: { limit?: number; offset?: number } = {},
  accessToken: string,
  user?: AuthUser | null,
): Promise<FacilityAsset[]> {
  const { data } = await apiClient.post<AssetSearchResponseItem[]>(
    "/asset-registry/v1/asset/_search",
    { RequestInfo: createRequestInfo(accessToken, user), criteria },
    { params: { limit: options.limit ?? 1000, offset: options.offset ?? 0 } },
  );

  return (data ?? []).map(toFacilityAsset);
}

/**
 * Raw rows (documents preserved, not simplified into `FacilityAsset`) for one
 * activity's asset sections — scoped by `activityFacilityID` rather than
 * `facilityID`, matching the installation review module's already-proven
 * criteria field for this same per-activity case.
 */
export async function searchAssetsForActivity(
  activityFacilityId: string,
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<AssetSearchResponseItem[]> {
  const { data } = await apiClient.post<AssetSearchResponseItem[]>(
    "/asset-registry/v1/asset/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      criteria: { tenantId, activityFacilityID: activityFacilityId },
    },
    { params: { limit: 1000, offset: 0 } },
  );

  return data ?? [];
}
