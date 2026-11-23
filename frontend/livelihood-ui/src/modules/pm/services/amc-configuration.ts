import { apiClient, tenantId as getTenantId } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AuthUser } from "@/shared/stores/auth-store";
import type {
  AmcConfigurationCreate,
  AmcConfigurationSearchResponse,
  AmcConfigurationUpdate,
  AmcFieldStaffUpdate,
  RawAmcConfiguration,
} from "../types/amc";

export interface AmcConfigurationSearchCriteria {
  tenantId?: string;
  ids?: string[];
  activityFacilityIds?: string[];
  statuses?: string[];
}

/**
 * `POST /asset-amc/v1/configuration/_search` — one call returns the end user, phone, place names,
 * installation approval date, vendor and field staff of every AMC, so the Edit AMC table needs
 * nothing else.
 */
export async function searchAmcConfigurations(
  criteria: AmcConfigurationSearchCriteria,
  options: { limit?: number; offset?: number } = {},
  accessToken: string,
  user?: AuthUser | null,
): Promise<AmcConfigurationSearchResponse> {
  const tenantId = criteria.tenantId ?? getTenantId();
  const { data } = await apiClient.post<AmcConfigurationSearchResponse>(
    "/asset-amc/v1/configuration/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      searchCriteria: { ...criteria, tenantId },
    },
    { params: { tenantId, limit: options.limit ?? 100, offset: options.offset ?? 0 } },
  );
  return data;
}

/**
 * `POST /asset-amc/v1/configuration/_update` — Edit AMC. All rows are checked first and nothing is
 * saved if any row fails; the error message names each failing row.
 */
export async function updateAmcConfigurations(
  updates: AmcConfigurationUpdate[],
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ AmcConfigurations?: RawAmcConfiguration[] }> {
  const { data } = await apiClient.post<{ AmcConfigurations?: RawAmcConfiguration[] }>(
    "/asset-amc/v1/configuration/_update",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      AmcConfigurations: updates,
    },
    { params: { tenantId: getTenantId() } },
  );
  return data;
}

/**
 * `POST /asset-amc/v1/configuration/field-staff/_update` — changes the one field staff of running
 * AMCs; the upcoming visit moves to the new person. Only the AMC's current organisation is used.
 */
export async function updateAmcFieldStaff(
  updates: AmcFieldStaffUpdate[],
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ AmcFieldStaffUpdates?: { activityFacilityId: string; outcome?: string }[] }> {
  const { data } = await apiClient.post<{ AmcFieldStaffUpdates?: { activityFacilityId: string; outcome?: string }[] }>(
    "/asset-amc/v1/configuration/field-staff/_update",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      AmcFieldStaffUpdates: updates,
    },
    { params: { tenantId: getTenantId() } },
  );
  return data;
}

/**
 * `POST /asset-amc/v1/configuration/_create` — turns AMC on for solar installation rows. All rows
 * are checked first and nothing is saved if any row fails.
 */
export async function createAmcConfigurations(
  configurations: AmcConfigurationCreate[],
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ AmcConfigurations?: RawAmcConfiguration[] }> {
  const { data } = await apiClient.post<{ AmcConfigurations?: RawAmcConfiguration[] }>(
    "/asset-amc/v1/configuration/_create",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      AmcConfigurations: configurations,
    },
    { params: { tenantId: getTenantId() } },
  );
  return data;
}

/**
 * `POST /asset-amc/v1/configuration/_delete` — turns AMCs off (status CANCELLED). Their visits not yet
 * submitted are removed; submitted reports stay and can still be reviewed. A completed AMC is refused.
 */
export async function deleteAmcConfigurations(
  configurations: { tenantId: string; id: string }[],
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ AmcConfigurations?: RawAmcConfiguration[] }> {
  const { data } = await apiClient.post<{ AmcConfigurations?: RawAmcConfiguration[] }>(
    "/asset-amc/v1/configuration/_delete",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      AmcConfigurations: configurations,
    },
    { params: { tenantId: getTenantId() } },
  );
  return data;
}
