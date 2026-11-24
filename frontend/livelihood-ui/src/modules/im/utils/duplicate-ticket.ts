import {
  LIVELIHOOD_INCIDENT_BUSINESS_SERVICE,
  OPEN_DUPLICATE_APPLICATION_STATUSES,
} from "../constants/workflow";
import type { CreateIncidentResponse } from "../types/create-incident";
import type { InboxSearchResponse } from "../types/inbox";
import type { IncidentFilterInput } from "./inbox-filters";

export interface ExistingTicket {
  ticketId: string;
  ticketTenantId: string;
}

export const DUPLICATE_TICKET_ERROR_CODE = "DUPLICATE_TICKET";

// The inbox can't filter on asset, so this fetches the end user's active
// tickets for the issue type and findActiveDuplicateTicket narrows to the asset.
export function buildDuplicateTicketFilters(
  facilityId: string,
  incidentType: string,
): IncidentFilterInput {
  return {
    limit: 100,
    offset: 0,
    services: [LIVELIHOOD_INCIDENT_BUSINESS_SERVICE],
    sortOrder: "DESC",
    facility: facilityId,
    incidentType,
    applicationStatus: OPEN_DUPLICATE_APPLICATION_STATUSES,
  };
}

export function findActiveDuplicateTicket(
  response: InboxSearchResponse | undefined,
  assetId: string,
  fallbackTenantId: string,
): ExistingTicket | null {
  const match = (response?.items ?? [])
    .map((item) => item.businessObject?.incident)
    .find((incident) => incident?.incidentId && incident.assetId === assetId);

  return match
    ? { ticketId: match.incidentId, ticketTenantId: match.tenantId ?? fallbackTenantId }
    : null;
}

// Backend message: "...Please refer to the existing ticket: <incidentId>".
export function existingTicketFromCreateError(
  response: CreateIncidentResponse | undefined,
  fallbackTenantId: string,
): ExistingTicket | null {
  const error = response?.Errors?.find((item) => item.code === DUPLICATE_TICKET_ERROR_CODE);
  const ticketId = error?.message?.split(":").pop()?.trim();
  return ticketId ? { ticketId, ticketTenantId: fallbackTenantId } : null;
}
