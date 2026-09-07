import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { IncidentSearchResponse } from "../types/incident-details";

export async function searchIncidentById(
  tenantId: string,
  incidentId: string,
  accessToken: string,
  user?: AuthUser | null,
): Promise<IncidentSearchResponse> {
  const { data } = await apiClient.post<IncidentSearchResponse>(
    "/im-services/v2/request/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
    },
    {
      params: { tenantId, incidentId },
    },
  );

  return data;
}
