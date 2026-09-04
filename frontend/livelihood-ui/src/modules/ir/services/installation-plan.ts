import { apiClient, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type {
  ActivityAssignment,
  ActivityAssignmentSearchResponse,
  InstallationPlan,
  InstallationPlanSearchResponse,
} from "../types/installation-plan";

export interface InstallationPlanSearchParams {
  limit?: number;
  offset?: number;
  searchText?: string;
  fieldPlanIds?: string[];
}

const QC_APPROVER_ROLE = "INSTALLATION_REPORT_APPROVER_QC_TEAM";

// Facility-level statuses as rolled up by the activity-assignment API's own
// `statusAgregation` — these are the real `FACILITY_INSTALLATION` business
// service states (see types/facility-review.ts's FACILITY_ENTRY_STATUS).
const STATUS_APPROVED = "APPROVED_BY_QC_SPOC";
const STATUS_PENDING_REVIEW = "SUBMITTED_BY_FIELD_STAFF";

export function formatEpochDate(epochMs: number): string {
  const date = new Date(epochMs);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function toInstallationPlan(row: ActivityAssignment): InstallationPlan {
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
  };
}

export async function searchInstallationPlans(
  tenantId: string,
  params: InstallationPlanSearchParams,
  accessToken: string,
  user?: AuthUser | null,
): Promise<InstallationPlanSearchResponse> {
  const { data } = await apiClient.post<ActivityAssignmentSearchResponse>(
    "/activity/v1/activities/assignment/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      ActivityAssignment: {
        tenantId,
        roles: [QC_APPROVER_ROLE],
        ...(params.searchText ? { fieldPlanCode: params.searchText } : {}),
        ...(params.fieldPlanIds?.length ? { fieldPlanIds: params.fieldPlanIds } : {}),
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

  return {
    plans: (data.ActivityAssignment ?? []).map(toInstallationPlan),
    totalCount: data.TotalCount ?? 0,
  };
}
