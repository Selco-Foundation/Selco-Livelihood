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

interface AssetDetails {
  panelCapacity?: number;
  batteryCapacity?: number;
  inverterCapacity?: number;
  batteryVoltage?: number;
  capacityUnit?: string;
  voltageUnit?: string;
  invertorCapacityUnit?: string;
}

interface AssetSearchResponseItem {
  assetId?: string;
  assetTypeID?: string;
  serialNumber?: string;
  modelNumber?: string;
  brandID?: string;
  isOperational?: boolean;
  warrantyStartDate?: number;
  assetDetails?: AssetDetails;
}

function formatCapacity(assetType: string | undefined, details: AssetDetails | undefined): string | undefined {
  if (!details) return undefined;
  switch (assetType) {
    case "PANEL":
      return details.panelCapacity !== undefined ? `${details.panelCapacity} ${details.capacityUnit ?? ""}`.trim() : undefined;
    case "BATTERY":
      return details.batteryCapacity !== undefined ? `${details.batteryCapacity} ${details.capacityUnit ?? ""}`.trim() : undefined;
    case "INVERTER":
      return details.inverterCapacity !== undefined
        ? `${details.inverterCapacity} ${details.invertorCapacityUnit ?? ""}`.trim()
        : undefined;
    default:
      return undefined;
  }
}

function formatVoltage(assetType: string | undefined, details: AssetDetails | undefined): string | undefined {
  if (assetType !== "BATTERY" || !details || details.batteryVoltage === undefined) {
    return undefined;
  }
  return `${details.batteryVoltage} ${details.voltageUnit ?? ""}`.trim();
}

function formatInstallationDate(timestamp: number | undefined): string | undefined {
  if (!timestamp) return undefined;
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toFacilityAsset(row: AssetSearchResponseItem): FacilityAsset {
  return {
    assetId: row.assetId ?? "",
    assetType: row.assetTypeID ?? "",
    serialNumber: row.serialNumber,
    modelNumber: row.modelNumber,
    brand: row.brandID,
    capacity: formatCapacity(row.assetTypeID, row.assetDetails),
    voltage: formatVoltage(row.assetTypeID, row.assetDetails),
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
