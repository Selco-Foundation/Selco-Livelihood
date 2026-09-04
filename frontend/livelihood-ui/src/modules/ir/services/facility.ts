import { apiClient, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type {
  ActivityFacilityRow,
  ActivityFacilitySearchResponse,
  FacilityEntry,
} from "../types/facility-review";

const ACTIVITY_CODE_INSTALLATION = "INS";

export interface FacilityEntrySearchParams {
  boundaryCodes?: string[];
  statuses?: string[];
  facilityName?: string;
  limit?: number;
  offset?: number;
}

export interface FacilityEntrySearchResult {
  entries: FacilityEntry[];
  totalCount: number;
}

function toFacilityEntry(row: ActivityFacilityRow): FacilityEntry {
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

export async function searchFacilityEntries(
  tenantId: string,
  planId: string,
  params: FacilityEntrySearchParams,
  accessToken: string,
  user?: AuthUser | null,
): Promise<FacilityEntrySearchResult> {
  const { data } = await apiClient.post<ActivityFacilitySearchResponse>(
    "/activity/v1/activities/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      ActivityFacility: {
        tenantId,
        fieldPlanIds: [planId],
        activityCodes: [ACTIVITY_CODE_INSTALLATION],
        ...(params.boundaryCodes?.length ? { boundaryCodes: params.boundaryCodes } : {}),
        ...(params.statuses?.length ? { statuses: params.statuses } : {}),
        ...(params.facilityName ? { facilityName: params.facilityName } : {}),
      },
    },
    {
      params: {
        tenantId: tenantId || getTenantId(),
        offset: params.offset ?? 0,
        limit: params.limit ?? 10,
      },
    },
  );

  const rows = data.facility ?? [];

  return {
    entries: rows.map(toFacilityEntry),
    totalCount: data.totalCount ?? 0,
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
