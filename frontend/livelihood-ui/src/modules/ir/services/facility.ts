import { apiClient, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type {
  ActivityFacilityRow,
  ActivityFacilitySearchResponse,
  FacilityEntry,
} from "../types/facility-review";

export const ACTIVITY_CODE_INSTALLATION = "INS";

/** The `ActivityFacility` request-body criteria — kept as one typed, extensible
 * object (matching qc's `ActivityService.fetchActivityFacilities(queryFilter, ...)`)
 * so every caller shares the same request shape instead of each building its
 * own ad hoc body. */
export interface ActivityFacilitySearchCriteria {
  tenantId: string;
  ids?: string[];
  fieldPlanIds?: string[];
  activityCodes?: string[];
  boundaryCodes?: string[];
  statuses?: string[];
  facilityName?: string;
}

/**
 * The one method that calls `/activity/v1/activities/_search` — picks the
 * criteria from the call, makes the request, and returns exactly what the
 * backend sent back. No mapping/orchestration here — that's a hook's job
 * (see hooks/use-facility-entries.ts, hooks/use-facility-review.ts), since
 * different call sites (list search, single-row detail fetch, ...) need the
 * raw response shaped differently.
 */
export async function searchActivityFacilities(
  criteria: ActivityFacilitySearchCriteria,
  options: { limit?: number; offset?: number } = {},
  accessToken: string,
  user?: AuthUser | null,
): Promise<ActivityFacilitySearchResponse> {
  const { data } = await apiClient.post<ActivityFacilitySearchResponse>(
    "/activity/v1/activities/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      ActivityFacility: criteria,
    },
    {
      params: {
        tenantId: criteria.tenantId || getTenantId(),
        offset: options.offset ?? 0,
        limit: options.limit ?? 10,
      },
    },
  );

  return data;
}

export function toFacilityEntry(row: ActivityFacilityRow): FacilityEntry {
  const { activityFacility } = row;
  const boundary = activityFacility.facility?.boundary;

  return {
    entryId: activityFacility.id,
    facilityId: activityFacility.facilityId,
    facilityName: activityFacility.facility?.facility_name ?? "",
    entryType: activityFacility.componentType,
    planId: activityFacility.fieldPlanId,
    status: activityFacility.status,
    district: boundary?.district ? { code: boundary.district } : undefined,
    block: boundary?.block ? { code: boundary.block } : undefined,
  };
}

export interface BulkApproveFacilityEntriesInput {
  entryIds: string[];
}

export interface BulkApproveFacilityEntriesResponse {
  approvedEntryIds: string[];
}

/**
 * Dummy implementation — pretends every requested entry approved successfully.
 * No real bulk-approve endpoint contract has been provided yet; swap this out
 * once one is available.
 */
export async function bulkApproveFacilityEntries(
  input: BulkApproveFacilityEntriesInput,
  accessToken: string,
  user?: AuthUser | null,
): Promise<BulkApproveFacilityEntriesResponse> {
  void accessToken;
  void user;

  return { approvedEntryIds: input.entryIds };
}
