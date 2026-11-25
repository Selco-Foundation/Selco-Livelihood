import { apiClient, postSearch, type AmcFieldStaffUpdateResponse, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AmcFieldStaffUpdate, FacilityAmcSearchResponse, OrgUserSearchResponse } from "../types/amc";

/** `POST /asset-amc/v1/configuration/_search` for one end user's site; each AMC lists the assets it covers. */
export async function searchFacilityAmcs(
  facilityId: string,
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<FacilityAmcSearchResponse> {
  const { data } = await apiClient.post<FacilityAmcSearchResponse>(
    "/asset-amc/v1/configuration/_search",
    { RequestInfo: createRequestInfo(accessToken, user), searchCriteria: { tenantId, facilityIds: [facilityId] } },
    { params: { tenantId, limit: 100, offset: 0 } },
  );
  return data;
}

/**
 * `POST /vendor/organisation/v1/user/_search` — organisation memberships, by organisation (its
 * members) or by user (the organisations a vendor user belongs to).
 */
export async function searchOrgUsers(
  criteria: { organizationIds?: string[]; userIds?: string[] },
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<OrgUserSearchResponse> {
  return postSearch<OrgUserSearchResponse>(
    "/vendor/organisation/v1/user/_search",
    "OrgUser",
    { tenantId, ...criteria },
    { accessToken, user, limit: 100 },
  );
}

/**
 * `POST /asset-amc/v1/configuration/field-staff/_update` — gives the running AMC a new field staff
 * in the new vendor organisation. The backend does not link this to the ticket's vendor change.
 */
export async function updateAmcFieldStaff(
  updates: AmcFieldStaffUpdate[],
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<AmcFieldStaffUpdateResponse> {
  const { data } = await apiClient.post<AmcFieldStaffUpdateResponse>(
    "/asset-amc/v1/configuration/field-staff/_update",
    { RequestInfo: createRequestInfo(accessToken, user), AmcFieldStaffUpdates: updates },
    { params: { tenantId } },
  );
  return data;
}
