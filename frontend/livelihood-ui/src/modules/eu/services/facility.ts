import { apiClient, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { Facility } from "../types/facility";

/**
 * The `Facility` `_bulk-search` request-body criteria. `fa`'s legacy `useFacility.js`
 * filtered by separate `state`/`district`/`block` arrays, but the real backend (verified
 * live) doesn't resolve a `boundary` object on the response and only narrows results by
 * leaf `boundaryCodes` — matching `shared/api/facility.ts`'s already-proven request shape.
 * Filter selections are resolved to leaf codes before reaching this criteria (see
 * `utils/boundary.ts`'s `resolveFacilityBoundaryCodes`).
 */
export interface FacilitySearchCriteria {
  tenantId: string[];
  limit: number;
  offset: number;
  boundaryCodes?: string[];
  facilityIds?: string[];
}

interface FacilitySearchResponseItem {
  facility_id?: string;
  facility_name?: string;
  facility_category?: string;
  facility_type?: string;
  isActive?: boolean;
  isOnmReady?: boolean;
  facility_poc_name?: string;
  facility_poc_username?: string;
  facility_poc_phone?: string;
  facility_poc_email?: string;
  facility_details?: { solar_solution_design_type?: string };
  address?: { latitude?: number; longitude?: number };
  boundaryCode?: string;
}

interface FacilitySearchResponse {
  facilities?: FacilitySearchResponseItem[];
  totalCount?: number;
}

function toFacility(item: FacilitySearchResponseItem): Facility {
  return {
    id: item.facility_id ?? "",
    facilityName: item.facility_name,
    facilityCategory: item.facility_category,
    facilityType: item.facility_type,
    isActive: item.isActive,
    isOnmReady: item.isOnmReady,
    pocName: item.facility_poc_name,
    pocUsername: item.facility_poc_username,
    pocPhone: item.facility_poc_phone,
    pocEmail: item.facility_poc_email,
    boundaryCode: item.boundaryCode,
    latitude: item.address?.latitude,
    longitude: item.address?.longitude,
    solarSolutionDesignType: item.facility_details?.solar_solution_design_type,
    raw: item as unknown as Record<string, unknown>,
  };
}

/**
 * The one method that calls `/facility-service/v2/facility/_bulk-search` for
 * the paginated facility admin list — picks the criteria from the call,
 * makes the request, and maps the response. Distinct from
 * `shared/api/facility.ts`'s `fetchFacilities`, which is a read-only,
 * non-paginated lookup used elsewhere for a filter dropdown.
 */
export async function searchFacilities(
  criteria: FacilitySearchCriteria,
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ facilities: Facility[]; total: number }> {
  const { data } = await apiClient.post<FacilitySearchResponse>(
    "/facility-service/v2/facility/_bulk-search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      Facility: criteria,
    },
  );

  const facilities = data.facilities?.map(toFacility) ?? [];

  return { facilities, total: data.totalCount ?? facilities.length };
}

/** The `Facility` create-request body — one entry, matching `fa`'s `FacilityAdminActions.js` payload shape. */
export interface CreateFacilityPayload {
  tenant_id: string;
  facility_name: string;
  facility_category: string;
  facility_type: string;
  isActive: boolean;
  isOnmReady: boolean;
  blockBoundaryCode: string;
  address: { tenantId: string; latitude?: number; longitude?: number };
  facility_poc_name: string;
  facility_poc_username: string;
  facility_poc_phone: string;
  facility_poc_email?: string;
  facility_details: { solar_solution_design_type?: string };
}

// Note: unlike the search endpoint above, `fa`'s legacy create/update calls send
// `{ facilities: [...] }` at the body's top level (no `Facility` wrapper key) —
// confirmed against `CustomRequest.js`, which only ever adds a top-level
// `RequestInfo` and never re-wraps the caller's own `data`.

export async function createFacility(
  payload: CreateFacilityPayload,
  accessToken: string,
  user?: AuthUser | null,
): Promise<unknown> {
  const { data } = await apiClient.post(
    "/facility-service/v2/facility/create",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      facilities: [payload],
    },
    { params: { tenantId: getTenantId() } },
  );

  return data;
}

/**
 * The `Facility` update-request body — a single `FacilityUpdate` object (not
 * an array like create), spreading the record's raw, untransformed fields
 * first so anything not explicitly edited here is preserved as-is. Matches
 * `fa`'s `FacilityDetails.js` `handleFacilityUpdate` payload shape exactly.
 */
export async function updateFacility(
  payload: Record<string, unknown>,
  accessToken: string,
  user?: AuthUser | null,
): Promise<unknown> {
  const { data } = await apiClient.post(
    "/facility-service/v2/facility/update",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      FacilityUpdate: payload,
    },
    { params: { tenantId: getTenantId() } },
  );

  return data;
}
