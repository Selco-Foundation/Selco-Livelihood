import {
  apiClient,
  type ActivityBillOfMaterial,
  type ActivityStatus,
  type ActivityTransaction,
  type ActivityWorkflowEntry,
  type AuthUser,
} from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";

// ActivityBomComponent/ActivityBillOfMaterial/ActivityTransaction(Comment)/
// ActivityWorkflowEntry live in @/shared — ir reads the same
// /activity/v1/activities/_search response for the same activity.

export interface ActivityFacilityRow {
  activityFacility?: {
    id?: string;
    activityType?: string;
    componentType?: "MACHINE" | "SOLAR";
    status?: ActivityStatus;
    fieldPlan?: { name?: string; project?: { name?: string } };
    facility?: { facility_name?: string; boundary?: { district?: string; block?: string } };
    billOfMaterial?: ActivityBillOfMaterial;
  };
  workflow?: ActivityWorkflowEntry[];
  transactions?: ActivityTransaction[];
}

interface ActivityFacilitySearchResponse {
  facility?: ActivityFacilityRow[];
}

/** Fetches one activity row by its own id — the same `_search` endpoint the facility's Activity tab list uses, scoped to a single row instead of a page. */
export async function fetchActivityFacilityById(
  activityId: string,
  tenantId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<ActivityFacilityRow | undefined> {
  const { data } = await apiClient.post<ActivityFacilitySearchResponse>(
    "/activity/v1/activities/_search",
    { RequestInfo: createRequestInfo(accessToken, user), ActivityFacility: { tenantId, ids: [activityId] } },
    { params: { tenantId, offset: 0, limit: 1 } },
  );

  return data.facility?.[0];
}
