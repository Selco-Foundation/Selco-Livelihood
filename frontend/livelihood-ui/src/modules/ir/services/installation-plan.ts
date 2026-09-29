import { apiClient, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { ActivityAssignmentSearchResponse } from "../types/installation-plan";

export const QC_APPROVER_ROLE = "INSTALLATION_REPORT_APPROVER_QC_TEAM";

/** The `ActivityAssignment` request-body criteria — one typed, extensible
 * object every caller shares, matching the same pattern as
 * services/facility.ts's `ActivityFacilitySearchCriteria`. */
export interface ActivityAssignmentSearchCriteria {
  tenantId: string;
  roles?: string[];
  fieldPlanCode?: string;
  fieldPlanIds?: string[];
}

/**
 * The one method that calls `/activity/v1/activities/assignment/_search` —
 * picks the criteria from the call, makes the request, and returns exactly
 * what the backend sent back. Criteria-shaping and response mapping for a
 * specific use case belong in the hook (see hooks/use-installation-plans.ts).
 */
export async function searchActivityAssignments(
  criteria: ActivityAssignmentSearchCriteria,
  options: { limit?: number; offset?: number } = {},
  accessToken: string,
  user?: AuthUser | null,
): Promise<ActivityAssignmentSearchResponse> {
  const { data } = await apiClient.post<ActivityAssignmentSearchResponse>(
    "/activity/v1/activities/assignment/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      ActivityAssignment: criteria,
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
