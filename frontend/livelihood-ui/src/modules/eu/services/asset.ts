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
  /** When true, a "family" asset (e.g. a SOLAR system) carries its unit
   * assets (Panel/Battery/Inverter) nested under `children` in the response,
   * instead of returning them as separate top-level rows. */
  includeChildren?: boolean;
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
  /** The vendor currently mapped to this asset — a raw user uuid today, with
   * no resolved display name available from this endpoint yet. */
  vendorId?: string;
  /** Null for a standalone asset or a top-level family asset; set to the
   * family asset's `assetId` on each of its own unit assets. */
  parentId?: string | null;
  /** Populated only on a top-level family asset when the search requests
   * `includeChildren: true` — null/absent on every other row, including each
   * of this array's own entries (the backend doesn't nest more than one
   * level deep today). */
  children?: AssetSearchResponseItem[] | null;
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
    vendorId: row.vendorId,
    children: row.children?.map(toFacilityAsset),
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

export interface UpdateAssetVendorMappingPayload {
  assetId: string;
  vendorId: string;
}

/**
 * The vendor-mapping update endpoint is still under development. Until it
 * exists, this resolves a static success response instead of calling
 * `apiClient`, so the row's dirty-to-saved flow can be exercised end to end.
 * Swap this body for a real POST once the endpoint is ready — the function's
 * signature/shape shouldn't need to change.
 */
export async function updateAssetVendorMapping(
  _payload: UpdateAssetVendorMappingPayload,
  _accessToken: string,
  _user?: AuthUser | null,
): Promise<{ status: "success" }> {
  return { status: "success" };
}
