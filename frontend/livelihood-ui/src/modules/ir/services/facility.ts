import { apiClient, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { ActivityFacilitySearchResponse } from "../types/activity-review";

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
  componentTypes?: string[];
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

/** The `/activity/v1/activities/bulk/workflow/update` request body — matches
 * qc's `ActivityService.bulkApproveActivityFacilities`. Our master checkbox
 * is page-scoped, so every call sends an explicit `activityFacilityIds` list
 * with `isAllSelected: false` — the backend still requires the field, it's
 * just never `true` from this module. */
export interface BulkActivityFacilityWorkflowCriteria {
  workflow: { action: string; comments: string };
  isAllSelected: boolean;
  activityFacilityIds?: string[];
}

/** The bulk-workflow-update response body's actual field names — the
 * backend always returns both lists, and signals which case applies via
 * HTTP status (200 all succeeded, 207 partial, 400 all failed). */
export interface BulkActivityFacilityWorkflowResponse {
  succeededProjectIDs?: string[];
  failedProjectIDs?: string[];
}

/** The one method that calls `/activity/v1/activities/bulk/workflow/update`
 * — picks the criteria from the call, makes the request, and returns
 * exactly what the backend sent back, status included (axios's default
 * validateStatus resolves any 2xx-3xx, so the status is the only signal
 * distinguishing a 207 partial failure from a 200 full success — the body
 * shape alone doesn't say which). */
export async function bulkUpdateActivityFacilitiesWorkflow(
  criteria: BulkActivityFacilityWorkflowCriteria,
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ status: number; data: BulkActivityFacilityWorkflowResponse }> {
  const response = await apiClient.post<BulkActivityFacilityWorkflowResponse>(
    "/activity/v1/activities/bulk/workflow/update",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      ...criteria,
    },
    { params: { tenantId } },
  );

  return { status: response.status, data: response.data };
}
