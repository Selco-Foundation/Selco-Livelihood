import { apiClient, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { JurisdictionBoundaries } from "@/shared";
import type { InboxSearchResponse } from "../types/inbox";
import {
  buildIncidentInboxFilters,
  type IncidentFilterInput,
} from "../utils/inbox-filters";

export interface InboxSearchPayload {
  inbox: {
    tenantId: string;
    processSearchCriteria: Record<string, unknown>;
    jurisdictionSearchCriteria: JurisdictionBoundaries;
    moduleSearchCriteria: Record<string, unknown>;
    limit?: number;
    offset?: number;
    /** Tickets waiting on the caller's roles instead of a uuid match; see usesAssignedToMe. */
    assignedToMe?: boolean;
  };
}

export async function searchInbox(
  tenantId: string,
  jurisdictionBoundaries: JurisdictionBoundaries,
  filters: IncidentFilterInput,
  accessToken: string,
  user: AuthUser | null | undefined,
  assignedToMe = false,
): Promise<InboxSearchResponse> {
  const {
    searchFilters,
    workflowFilters,
    limit,
    offset,
    sortBy,
    sortOrder,
    applicationNumber,
  } = buildIncidentInboxFilters(filters, tenantId);

  const payload: InboxSearchPayload = {
    inbox: {
      tenantId,
      processSearchCriteria: workflowFilters,
      jurisdictionSearchCriteria: jurisdictionBoundaries,
      moduleSearchCriteria: {
        ...searchFilters,
        sortBy,
        sortOrder,
        applicationNumber,
      },
      limit,
      offset,
      ...(assignedToMe ? { assignedToMe } : {}),
    },
  };

  const { data } = await apiClient.post<InboxSearchResponse>(
    "/inbox/v2/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      ...payload,
    },
    {
      params: { tenantId },
    },
  );

  return data;
}
