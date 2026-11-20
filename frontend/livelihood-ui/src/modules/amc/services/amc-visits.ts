import { apiClient, postSearch, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type {
  AmcProjectSummarySearchResponse,
  AmcVisitSearchCriteria,
  AmcVisitSearchResponse,
} from "../types/amc-visit";

/**
 * `POST /asset-amc/v1/visit/_search` — the reviewer lists, the report detail (`ids` +
 * `includeSiteDetails`) and the home count (`isCountQuery`). Paging is in the query string.
 */
export async function searchAmcVisits(
  searchCriteria: AmcVisitSearchCriteria,
  page: { limit: number; offset: number },
  accessToken: string,
  user?: AuthUser | null,
): Promise<AmcVisitSearchResponse> {
  const { data } = await apiClient.post<AmcVisitSearchResponse>(
    "/asset-amc/v1/visit/_search",
    { RequestInfo: createRequestInfo(accessToken, user), searchCriteria },
    { params: { tenantId: searchCriteria.tenantId, limit: page.limit, offset: page.offset } },
  );
  return data;
}

/**
 * `POST /asset-amc/v1/visit/workflow/_update` — the reviewer's APPROVE or REJECT. A rework
 * `comment` is a JSON string of `[{ reason, comment }]`. Both make a new report PDF before saving;
 * if that fails (`AMC_PDF_GENERATION_FAILED`) nothing changes and the reviewer can retry.
 */
export async function updateAmcVisitWorkflow(
  visitId: string,
  action: "APPROVE" | "REJECT",
  comment: string | null,
  accessToken: string,
  user?: AuthUser | null,
): Promise<AmcVisitSearchResponse> {
  const { data } = await apiClient.post<AmcVisitSearchResponse>(
    "/asset-amc/v1/visit/workflow/_update",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      visitId,
      visitReport: {},
      workflow: { action, comment, documents: [] },
    },
    { params: { tenantId: getTenantId() } },
  );
  return data;
}

/** `POST /asset-amc/v1/visit/project-summary/_search` — five counts per project with submitted reports. */
export async function searchAmcProjectSummaries(
  criteria: { projectIds?: string[]; projectName?: string; offset: number; limit: number },
  accessToken: string,
  user?: AuthUser | null,
): Promise<AmcProjectSummarySearchResponse> {
  const tenantId = getTenantId();
  const { data } = await apiClient.post<AmcProjectSummarySearchResponse>(
    "/asset-amc/v1/visit/project-summary/_search",
    { RequestInfo: createRequestInfo(accessToken, user), searchCriteria: { tenantId, ...criteria } },
    { params: { tenantId } },
  );
  return data;
}

export interface RawVendorOrganisation {
  id?: string;
  name?: string;
  orgStatus?: string;
}

/**
 * `POST /vendor/organisation/v1/_search` — every vendor organisation, for the Vendor filter (the
 * visit search filters by organisation id). The response key is lowercase `organisations`.
 */
export async function searchVendorOrganisations(
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ organisations?: RawVendorOrganisation[] }> {
  return postSearch<{ organisations?: RawVendorOrganisation[] }>(
    "/vendor/organisation/v1/_search",
    "SearchCriteria",
    { tenantId: getTenantId(), orgType: "VENDOR" },
    { accessToken, user, limit: 100 },
  );
}
