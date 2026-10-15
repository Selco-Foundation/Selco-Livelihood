import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/shared";
import type { InboxItem, InboxSearchResponse, InboxStatusMapEntry } from "../types/inbox";
import { combineInboxResponses, normalizeInboxResponse, sumStatusCounts } from "./inbox-transform";

const SLA_MS_PER_DAY = 8 * 60 * 60 * 1000;

function makeItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    businessObject: {
      incident: {
        incidentId: "INC-1",
        incidentType: "solar_light",
        applicationStatus: "PENDING_FOR_RESOLUTION",
        tenantId: "tenant-1",
      },
    },
    ...overrides,
  };
}

describe("combineInboxResponses", () => {
  it("returns a dash for sla when the incident status is a blank-sla status", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "RESOLVED",
          tenantId: "tenant-1",
        },
        slaRemaining: SLA_MS_PER_DAY,
      },
    });
    const [row] = combineInboxResponses([item], undefined);
    expect(row.sla).toBe("-");
  });

  it("uses totalSlaRemaining for an end user", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          tenantId: "tenant-1",
        },
        totalSlaRemaining: 2 * SLA_MS_PER_DAY,
      },
    });
    const currentUser: AuthUser = { uuid: "u-1", roles: [{ code: "COMPLAINANT" }] };
    const [row] = combineInboxResponses([item], currentUser);
    expect(row.sla).toBe("2");
  });

  it("uses slaRemaining when the current user is the assignee", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          tenantId: "tenant-1",
        },
        slaRemaining: SLA_MS_PER_DAY,
      },
      ProcessInstance: { assignes: [{ uuid: "u-1", name: "Assignee One" }] },
    });
    const currentUser: AuthUser = { uuid: "u-1", roles: [{ code: "COMPLAINT_RESOLVER" }] };
    const [row] = combineInboxResponses([item], currentUser);
    expect(row.sla).toBe("1");
    expect(row.taskOwner).toBe("Assignee One");
  });

  it("uses slaRemaining when the current user is a POC even if not the assignee", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          tenantId: "tenant-1",
        },
        slaRemaining: SLA_MS_PER_DAY,
      },
      ProcessInstance: { assignes: [{ uuid: "someone-else", name: "Someone Else" }] },
    });
    const currentUser: AuthUser = { uuid: "u-1", roles: [{ code: "LIVELIHOOD_POC" }] };
    const [row] = combineInboxResponses([item], currentUser);
    expect(row.sla).toBe("1");
  });

  it("uses slaRemaining for an unassigned incident when the user holds a required role for that status", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          tenantId: "tenant-1",
        },
        slaRemaining: SLA_MS_PER_DAY,
      },
    });
    const currentUser: AuthUser = { uuid: "u-1", roles: [{ code: "COMPLAINT_RESOLVER" }] };
    const [row] = combineInboxResponses([item], currentUser);
    expect(row.sla).toBe("1");
  });

  it("returns a dash for sla for an unassigned incident when the user holds no required role", () => {
    const item = makeItem();
    const currentUser: AuthUser = { uuid: "u-1", roles: [{ code: "VIEWER" }] };
    const [row] = combineInboxResponses([item], currentUser);
    expect(row.sla).toBe("-");
  });

  it("reports OVERDUE when the remaining sla is negative", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          tenantId: "tenant-1",
        },
        slaRemaining: -1000,
      },
    });
    const currentUser: AuthUser = { uuid: "u-1", roles: [{ code: "COMPLAINT_RESOLVER" }] };
    const [row] = combineInboxResponses([item], currentUser);
    expect(row.sla).toBe("OVERDUE");
    expect(row.slaUrgent).toBe(true);
  });

  it("marks slaUrgent when the numeric sla value is 1 or less", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          tenantId: "tenant-1",
        },
        slaRemaining: SLA_MS_PER_DAY,
      },
    });
    const currentUser: AuthUser = { uuid: "u-1", roles: [{ code: "COMPLAINT_RESOLVER" }] };
    const [row] = combineInboxResponses([item], currentUser);
    expect(row.slaUrgent).toBe(true);
  });

  it("prefixes assetLabel with BOUNDARY_ when a boundaryCode is present", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          tenantId: "tenant-1",
          boundaryCode: "BC-1",
        },
      },
    });
    const [row] = combineInboxResponses([item], undefined);
    expect(row.assetLabel).toBe("BOUNDARY_BC-1");
  });

  it("falls back to a dash for assetLabel when boundaryCode is missing", () => {
    const [row] = combineInboxResponses([makeItem()], undefined);
    expect(row.assetLabel).toBe("-");
  });

  it("falls back to a dash for taskOwner when there is no assignee", () => {
    const [row] = combineInboxResponses([makeItem()], undefined);
    expect(row.taskOwner).toBe("-");
  });

  it("falls back to a dash for endUser when there is no reporter name", () => {
    const [row] = combineInboxResponses([makeItem()], undefined);
    expect(row.endUser).toBe("-");
  });

  it("uses the reporter's name for endUser when present", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          tenantId: "tenant-1",
          reporter: { name: "Reporter One" },
        },
      },
    });
    const [row] = combineInboxResponses([item], undefined);
    expect(row.endUser).toBe("Reporter One");
  });

  it("flags potentialDuplicate only for a POC viewing an incident marked as a potential duplicate", () => {
    const item = makeItem({
      businessObject: {
        incident: {
          incidentId: "INC-1",
          incidentType: "solar_light",
          applicationStatus: "PENDING_FOR_RESOLUTION",
          tenantId: "tenant-1",
          isPotentialDuplicate: true,
        },
      },
    });
    const poc: AuthUser = { uuid: "u-1", roles: [{ code: "LIVELIHOOD_POC" }] };
    const nonPoc: AuthUser = { uuid: "u-2", roles: [{ code: "COMPLAINT_RESOLVER" }] };

    expect(combineInboxResponses([item], poc)[0].potentialDuplicate).toBe(true);
    expect(combineInboxResponses([item], nonPoc)[0].potentialDuplicate).toBe(false);
  });

  it("defaults a missing businessObject.incident to an empty-shaped incident", () => {
    const item: InboxItem = { businessObject: {} };
    const [row] = combineInboxResponses([item], undefined);
    expect(row.incidentId).toBe("");
    expect(row.incidentType).toBe("");
    expect(row.status).toBe("");
  });

  it("returns an empty array for no items", () => {
    expect(combineInboxResponses([], undefined)).toEqual([]);
  });
});

describe("normalizeInboxResponse", () => {
  it("defaults total, items, and statusArray when the response omits them", () => {
    const result = normalizeInboxResponse({} as InboxSearchResponse);
    expect(result).toEqual({ total: 0, items: [], statusArray: [], nearingSlaCount: undefined });
  });

  it("passes through the raw response fields when present", () => {
    const response: InboxSearchResponse = {
      totalCount: 5,
      items: [makeItem()],
      statusMap: [{ statusid: "OPEN", count: 3 }],
      nearingSlaCount: 2,
    };
    const result = normalizeInboxResponse(response);
    expect(result).toEqual({
      total: 5,
      items: response.items,
      statusArray: response.statusMap,
      nearingSlaCount: 2,
    });
  });
});

describe("sumStatusCounts", () => {
  const statusArray: InboxStatusMapEntry[] = [
    { statusid: "OPEN", count: 3 },
    { statusid: "CLOSED", count: 2 },
    { statusid: "RESOLVED", count: 4 },
  ];

  it("sums the counts for entries whose statusid is in the given list", () => {
    expect(sumStatusCounts(statusArray, ["OPEN", "RESOLVED"])).toBe(7);
  });

  it("returns 0 when no entry matches", () => {
    expect(sumStatusCounts(statusArray, ["UNKNOWN"])).toBe(0);
  });

  it("treats a missing count as 0", () => {
    const entries: InboxStatusMapEntry[] = [{ statusid: "OPEN", count: undefined as unknown as number }];
    expect(sumStatusCounts(entries, ["OPEN"])).toBe(0);
  });

  it("returns 0 when statusArray is undefined", () => {
    expect(sumStatusCounts(undefined, ["OPEN"])).toBe(0);
  });
});
