import { apiClient, tenantId as getTenantId } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AuthUser } from "@/shared/stores/auth-store";

export interface PlanActivityFacilityRow {
  activityFacility: {
    id: string;
    facilityId?: string;
    fieldPlanId?: string;
    componentType?: "SOLAR" | "MACHINE";
    status?: string;
  };
}

export interface PlanActivityFacilitySearchResponse {
  totalCount?: number;
  facility?: PlanActivityFacilityRow[];
}

/**
 * `POST /activity/v1/activities/_search` — the installation rows (one per component) of one plan.
 * The AMC screens only need the SOLAR rows, because an AMC belongs to a SOLAR row.
 */
export async function searchPlanActivityFacilities(
  criteria: { fieldPlanIds: string[]; componentTypes?: string[] },
  options: { limit?: number; offset?: number } = {},
  accessToken: string,
  user?: AuthUser | null,
): Promise<PlanActivityFacilitySearchResponse> {
  const tenantId = getTenantId();
  const { data } = await apiClient.post<PlanActivityFacilitySearchResponse>(
    "/activity/v1/activities/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      ActivityFacility: { tenantId, ...criteria },
    },
    { params: { tenantId, limit: options.limit ?? 200, offset: options.offset ?? 0 } },
  );
  return data;
}
