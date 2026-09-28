import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { FacilityActivity } from "../types/activity";

/**
 * The `ActivityFacility` `_search` request-body criteria. Filters by
 * `boundaryCodes` (the facility's own leaf boundary code) rather than a
 * facility-id field — `ir`'s already-proven `services/facility.ts` criteria
 * for this same endpoint has no `facilityIds` field, only `boundaryCodes`.
 */
export interface ActivityFacilitySearchCriteria {
  tenantId: string;
  boundaryCodes?: string[];
  activityCodes?: string[];
}

interface ActivityFacilityResponseRow {
  activityFacility?: {
    id?: string;
    activityType?: string;
    activatedAt?: number;
    completedAt?: number;
    fieldPlan?: {
      id?: string;
      name?: string;
      endDate?: string;
      project?: { id?: string; name?: string };
    };
  };
}

interface ActivityFacilitySearchResponse {
  facility?: ActivityFacilityResponseRow[];
  totalCount?: number;
}

function formatDate(timestamp: number | string | undefined): string | undefined {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

/** Assessment activities are tracked by the assessment module's own mark-complete
 * flow, which never updates this generic activity-tracking service's `completedAt`
 * — fall back to the field plan's own end date instead, matching `fa`'s `useActivity.js`. */
function activityEndDate(activityFacility: ActivityFacilityResponseRow["activityFacility"]): string | undefined {
  return activityFacility?.activityType?.toUpperCase() === "ASSESSMENT"
    ? activityFacility.fieldPlan?.endDate
    : formatDate(activityFacility?.completedAt);
}

function toFacilityActivity(row: ActivityFacilityResponseRow): FacilityActivity {
  const activityFacility = row.activityFacility;
  return {
    id: activityFacility?.id ?? "",
    activityType: activityFacility?.activityType,
    projectCode: activityFacility?.fieldPlan?.project?.name,
    fieldPlanCode: activityFacility?.fieldPlan?.name,
    activityStartDate: formatDate(activityFacility?.activatedAt),
    activityEndDate: activityEndDate(activityFacility),
  };
}

export async function searchFacilityActivities(
  criteria: ActivityFacilitySearchCriteria,
  options: { limit?: number; offset?: number } = {},
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ activities: FacilityActivity[]; total: number }> {
  const { data } = await apiClient.post<ActivityFacilitySearchResponse>(
    "/activity/v1/activities/_search",
    { RequestInfo: createRequestInfo(accessToken, user), ActivityFacility: criteria },
    { params: { tenantId: criteria.tenantId, offset: options.offset ?? 0, limit: options.limit ?? 10 } },
  );

  const activities = data.facility?.map(toFacilityActivity) ?? [];
  return { activities, total: data.totalCount ?? activities.length };
}
