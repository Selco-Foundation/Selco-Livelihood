import { describe, expect, it } from "vitest";
import { OPEN_DUPLICATE_APPLICATION_STATUSES } from "../constants/workflow";
import type { InboxSearchResponse } from "../types/inbox";
import {
  buildDuplicateTicketFilters,
  existingTicketFromCreateError,
  findActiveDuplicateTicket,
} from "./duplicate-ticket";

function inbox(
  incidents: Array<{ incidentId: string; assetId?: string; tenantId?: string }>,
): InboxSearchResponse {
  return {
    items: incidents.map((incident) => ({
      businessObject: {
        incident: {
          incidentType: "SVC1",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          ...incident,
        } as never,
      },
    })),
    totalCount: incidents.length,
  };
}

describe("buildDuplicateTicketFilters", () => {
  it("scopes the search to the end user's facility, the issue type and active statuses, newest first", () => {
    expect(buildDuplicateTicketFilters("fac-1", "SVC1")).toEqual({
      limit: 100,
      offset: 0,
      services: ["LivelihoodIncident"],
      sortOrder: "DESC",
      facility: "fac-1",
      incidentType: "SVC1",
      applicationStatus: OPEN_DUPLICATE_APPLICATION_STATUSES,
    });
  });
});

describe("findActiveDuplicateTicket", () => {
  it("returns the first ticket for the selected asset", () => {
    const response = inbox([
      { incidentId: "T-OTHER", assetId: "asset-2", tenantId: "tenant-1" },
      { incidentId: "T-NEW", assetId: "asset-1", tenantId: "tenant-2" },
      { incidentId: "T-OLD", assetId: "asset-1", tenantId: "tenant-2" },
    ]);

    expect(findActiveDuplicateTicket(response, "asset-1", "tenant-1")).toEqual({
      ticketId: "T-NEW",
      ticketTenantId: "tenant-2",
    });
  });

  it("returns null when only other assets have an active ticket for the issue type", () => {
    const response = inbox([{ incidentId: "T1", assetId: "asset-2" }]);

    expect(findActiveDuplicateTicket(response, "asset-1", "tenant-1")).toBeNull();
  });

  it("falls back to the given tenant when the incident has none", () => {
    const response = inbox([{ incidentId: "T1", assetId: "asset-1", tenantId: undefined }]);

    expect(findActiveDuplicateTicket(response, "asset-1", "tenant-1")).toEqual({
      ticketId: "T1",
      ticketTenantId: "tenant-1",
    });
  });

  it("returns null for an empty or missing response", () => {
    expect(findActiveDuplicateTicket(undefined, "asset-1", "tenant-1")).toBeNull();
    expect(findActiveDuplicateTicket(inbox([]), "asset-1", "tenant-1")).toBeNull();
  });
});

describe("existingTicketFromCreateError", () => {
  it("reads the existing ticket number off a DUPLICATE_TICKET error", () => {
    const response = {
      Errors: [
        {
          code: "DUPLICATE_TICKET",
          message:
            "You already have a ticket raised for this asset with the same issue. Please refer to the existing ticket: LH-2026-11-000123",
        },
      ],
    };

    expect(existingTicketFromCreateError(response, "tenant-1")).toEqual({
      ticketId: "LH-2026-11-000123",
      ticketTenantId: "tenant-1",
    });
  });

  it("returns null for any other error", () => {
    const response = { Errors: [{ code: "VENDOR_NOT_MAPPED", message: "No vendor: x" }] };

    expect(existingTicketFromCreateError(response, "tenant-1")).toBeNull();
    expect(existingTicketFromCreateError(undefined, "tenant-1")).toBeNull();
  });
});
