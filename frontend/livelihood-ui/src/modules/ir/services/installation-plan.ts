import { apiClient, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import { formatEpochDate } from "../utils/date-format";
import type {
  ActivityAssignment,
  ActivityAssignmentSearchResponse,
  InstallationPlan,
} from "../types/installation-plan";

export const QC_APPROVER_ROLE = "INSTALLATION_REPORT_APPROVER_QC_TEAM";

// Facility-level statuses as rolled up by the activity-assignment API's own
// `statusAgregation` — these are the real `FACILITY_INSTALLATION` business
// service states (see types/facility-review.ts's FACILITY_ENTRY_STATUS).
const STATUS_APPROVED = "APPROVED_BY_QC_SPOC";
const STATUS_PENDING_REVIEW = "SUBMITTED_BY_FIELD_STAFF";

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

export function toInstallationPlan(row: ActivityAssignment): InstallationPlan {
  const totalFacilities = row.additionalDetails?.countFieldPlanFacilities ?? 0;
  const statusCounts = new Map(
    (row.additionalDetails?.statusAgregation ?? []).map((entry) => [entry.status, entry.occurrences]),
  );
  const approvedCount = statusCounts.get(STATUS_APPROVED) ?? 0;
  // `occurrences` appears to count status *transitions* over a facility's history
  // (e.g. rejected then re-approved counts twice), not distinct current facilities,
  // so it can exceed `totalFacilities` — clamp, since >100% is never a valid display.
  const completionRate =
    totalFacilities > 0 ? Math.min(100, Math.ceil((approvedCount / totalFacilities) * 100)) : 0;

  return {
    planId: row.fieldPlanId,
    planName: row.fieldPlan?.name ?? "",
    tenantId: row.tenantId,
    totalFacilities,
    startDate: formatEpochDate(row.startDate),
    endDate: formatEpochDate(row.endDate),
    pendingReviewCount: statusCounts.get(STATUS_PENDING_REVIEW) ?? 0,
    completionRate,
    stateCode: row.fieldPlan?.geographyDetails?.state,
  };
}
