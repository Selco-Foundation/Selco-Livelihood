import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";

export interface ActivityWorkflowDocument {
  documentType?: string;
  fileStoreId?: string;
}

export interface ActivityWorkflowEntry {
  id?: string;
  comment?: string;
  documents?: ActivityWorkflowDocument[] | null;
  state?: { applicationStatus?: string };
  assigner?: { name?: string };
  auditDetails?: { createdTime?: number };
}

export interface ActivityFacilityRow {
  activityFacility?: {
    id?: string;
    activityType?: string;
    fieldPlan?: { name?: string; project?: { name?: string } };
    facility?: { facility_name?: string };
  };
  workflow?: ActivityWorkflowEntry[];
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
