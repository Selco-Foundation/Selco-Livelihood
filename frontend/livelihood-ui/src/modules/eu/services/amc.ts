import { apiClient, postSearch, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AmcFieldStaffUpdate, FacilityAmcSearchResponse } from "../types/amc";

/** `POST /asset-amc/v1/configuration/_search` for one end user's site; each AMC lists the assets it covers. */
export async function searchFacilityAmcs(
  facilityId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<FacilityAmcSearchResponse> {
  const tenantId = getTenantId();
  const { data } = await apiClient.post<FacilityAmcSearchResponse>(
    "/asset-amc/v1/configuration/_search",
    { RequestInfo: createRequestInfo(accessToken, user), searchCriteria: { tenantId, facilityIds: [facilityId] } },
    { params: { tenantId, limit: 100, offset: 0 } },
  );
  return data;
}

/** `POST /vendor/organisation/v1/user/_search` filtered to the AMC field staff of one organisation. */
export async function searchAmcFieldStaff(
  organizationId: string,
  accessToken: string,
  user?: AuthUser | null,
) {
  return postSearch<{ OrgUsers?: { id?: string; userId?: string; user?: { name?: string; roles?: { code?: string }[] } }[] }>(
    "/vendor/organisation/v1/user/_search",
    "OrgUser",
    { tenantId: getTenantId(), organizationIds: [organizationId] },
    { accessToken, user, limit: 100 },
  );
}

/**
 * `POST /asset-amc/v1/configuration/field-staff/_update` — gives the running AMC a new field staff
 * and, with `vendorOrgId`, a new vendor organisation. Separate from the asset's vendor mapping:
 * the backend does not link the two, so the vendor change screen calls both.
 */
export async function updateAmcFieldStaff(
  updates: AmcFieldStaffUpdate[],
  accessToken: string,
  user?: AuthUser | null,
): Promise<unknown> {
  const { data } = await apiClient.post(
    "/asset-amc/v1/configuration/field-staff/_update",
    { RequestInfo: createRequestInfo(accessToken, user), AmcFieldStaffUpdates: updates },
    { params: { tenantId: getTenantId() } },
  );
  return data;
}
