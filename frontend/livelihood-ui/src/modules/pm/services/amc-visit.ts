import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { AmcVisitSearchResponse } from "../types/amc";

/** `POST /asset-amc/v1/visit/_search` — the visits of some AMCs (Edit AMC counts the submitted ones). */
export async function searchAmcVisits(
  searchCriteria: { tenantId: string; amcConfigurationIds: string[] },
  options: { limit: number; offset?: number },
  accessToken: string,
  user?: AuthUser | null,
): Promise<AmcVisitSearchResponse> {
  const { data } = await apiClient.post<AmcVisitSearchResponse>(
    "/asset-amc/v1/visit/_search",
    { RequestInfo: createRequestInfo(accessToken, user), searchCriteria },
    { params: { tenantId: searchCriteria.tenantId, limit: options.limit, offset: options.offset ?? 0 } },
  );
  return data;
}
