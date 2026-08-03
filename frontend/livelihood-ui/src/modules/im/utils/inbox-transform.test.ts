/**
 * Unit tests for src/modules/im/utils/inbox-transform.ts.
 *
 * Covers three pure, framework-free helper functions used to turn raw
 * inbox-search API payloads into view-model rows for the IM inbox table:
 *  - combineInboxResponses: the SLA/role/permission business logic that
 *    decides what each row's SLA value, task owner, asset label, and
 *    "potential duplicate" flag should read as.
 *  - normalizeInboxResponse: defaults out an optional API response shape.
 *  - sumStatusCounts: aggregates status-map counts for a set of statuses.
 *
 * Testing approach: since these are plain functions with no React
 * rendering, i18n provider, or network calls involved, no mocking,
 * providers, or wrappers are needed - test data is built with small
 * `buildItem`/`buildUser` factories and asserted on directly. The `t`
 * translate function is faked with `noopT`, an identity function that
 * just returns the key it's given; this is enough to exercise the
 * `translateOr(t, "SLA_OVERDUE", "Overdue")` fallback path without
 * pulling in a real i18n setup.
 */
import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/shared";
import type { InboxItem, InboxStatusMapEntry } from "../types/inbox";
import { combineInboxResponses, normalizeInboxResponse, sumStatusCounts } from "./inbox-transform";

const SLA_MS_PER_DAY = 8 * 60 * 60 * 1000;

function buildItem(overrides: Partial<InboxItem["businessObject"]["incident"]> = {}, itemOverrides: Partial<InboxItem> = {}): InboxItem {
  return {
    businessObject: {
      incident: {
        incidentId: "INC-1",
        incidentType: "streetlight",
        applicationStatus: "PENDING_FOR_RESOLUTION",
        tenantId: "livelihood",
        ...overrides,
      },
      ...itemOverrides.businessObject,
    },
    ProcessInstance: itemOverrides.ProcessInstance,
  };
}

function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return { uuid: "user-1", roles: [{ code: "COMPLAINT_RESOLVER" }], ...overrides };
}

const noopT = (key: string) => key;

// combineInboxResponses maps raw InboxItem[] entries (as returned by the
// search API) into InboxRow[] for the table. It expects the current user
// (or null/undefined for a logged-out/unknown state) plus a translate
// function, and derives each row's `sla` value from a priority of rules:
//   1. blank-SLA statuses (resolved/closed) always show "-", regardless
//      of any slaRemaining/totalSlaRemaining present on the item.
//   2. "end users" (every role is EMPLOYEE or COMPLAINANT) use
//      totalSlaRemaining, showing a translated "Overdue" label when
//      negative, otherwise the remaining days rounded up.
//   3. otherwise, if the current user is the assigned owner, use
//      slaRemaining (days remaining, rounded up).
//   4. otherwise, if the ticket is unassigned, use slaRemaining only when
//      the user holds a role listed in ROLE_STATUS_MAPPING for that
//      ticket's applicationStatus; unassigned + ineligible role, or
//      assigned to someone else, falls through to the "-" default.
// It also derives assetLabel (from boundaryCode), taskOwner/endUser name
// fallbacks, and a potentialDuplicate flag that's only ever true for
// LIVELIHOOD_POC users on incidents flagged as a duplicate.
describe("combineInboxResponses", () => {
  // BLANK_SLA_STATUSES takes precedence over every other rule, even though
  // this item has a non-zero slaRemaining - the status alone forces "-".
  it("shows '-' for SLA when the status is a blank-SLA (resolved/closed) status", () => {
    const items = [
      buildItem(
        { applicationStatus: "RESOLVED" },
        { businessObject: { slaRemaining: 1000 } as InboxItem["businessObject"] },
      ),
    ];
    const [row] = combineInboxResponses(items, buildUser(), noopT);
    expect(row.sla).toBe("-");
  });

  it("shows the overdue label for an end user when totalSlaRemaining is negative", () => {
    const endUser = buildUser({ roles: [{ code: "EMPLOYEE" }] });
    const items: InboxItem[] = [
      {
        businessObject: {
          incident: {
            incidentId: "INC-1",
            incidentType: "streetlight",
            applicationStatus: "PENDING_FOR_RESOLUTION",
            tenantId: "livelihood",
          },
          totalSlaRemaining: -1000,
        },
      },
    ];
    const [row] = combineInboxResponses(items, endUser, (key) => key);
    expect(row.sla).toBe("Overdue");
  });

  it("shows remaining days (ceil) for an end user with positive totalSlaRemaining", () => {
    const endUser = buildUser({ roles: [{ code: "EMPLOYEE" }] });
    const items: InboxItem[] = [
      {
        businessObject: {
          incident: {
            incidentId: "INC-1",
            incidentType: "streetlight",
            applicationStatus: "PENDING_FOR_RESOLUTION",
            tenantId: "livelihood",
          },
          totalSlaRemaining: SLA_MS_PER_DAY * 2.1,
        },
      },
    ];
    const [row] = combineInboxResponses(items, endUser, noopT);
    expect(row.sla).toBe("3");
  });

  it("shows remaining days from slaRemaining when the current user is the assignee", () => {
    const user = buildUser({ uuid: "assignee-1" });
    const items: InboxItem[] = [
      {
        businessObject: {
          incident: {
            incidentId: "INC-1",
            incidentType: "streetlight",
            applicationStatus: "PENDING_FOR_RESOLUTION",
            tenantId: "livelihood",
          },
          slaRemaining: SLA_MS_PER_DAY * 1.2,
        },
        ProcessInstance: { assignes: [{ uuid: "assignee-1", name: "Assignee One" }] },
      },
    ];
    const [row] = combineInboxResponses(items, user, noopT);
    expect(row.sla).toBe("2");
    expect(row.taskOwner).toBe("Assignee One");
  });

  it("shows remaining days for an unassigned ticket when the user's role is eligible for that status", () => {
    const user = buildUser({ roles: [{ code: "LIVELIHOOD_VENDOR" }] });
    const items: InboxItem[] = [
      {
        businessObject: {
          incident: {
            incidentId: "INC-1",
            incidentType: "streetlight",
            applicationStatus: "PENDING_FOR_RESOLUTION",
            tenantId: "livelihood",
          },
          slaRemaining: SLA_MS_PER_DAY,
        },
      },
    ];
    const [row] = combineInboxResponses(items, user, noopT);
    expect(row.sla).toBe("1");
  });

  it("shows '-' for an unassigned ticket when the user's role isn't eligible for that status", () => {
    const user = buildUser({ roles: [{ code: "VIEWER" }] });
    const items: InboxItem[] = [
      {
        businessObject: {
          incident: {
            incidentId: "INC-1",
            incidentType: "streetlight",
            applicationStatus: "PENDING_FOR_RESOLUTION",
            tenantId: "livelihood",
          },
          slaRemaining: SLA_MS_PER_DAY,
        },
      },
    ];
    const [row] = combineInboxResponses(items, user, noopT);
    expect(row.sla).toBe("-");
  });

  it("shows '-' when the ticket is assigned to someone else and the user isn't an end user", () => {
    const user = buildUser({ uuid: "user-1", roles: [{ code: "COMPLAINT_RESOLVER" }] });
    const items: InboxItem[] = [
      {
        businessObject: {
          incident: {
            incidentId: "INC-1",
            incidentType: "streetlight",
            applicationStatus: "PENDING_FOR_RESOLUTION",
            tenantId: "livelihood",
          },
          slaRemaining: SLA_MS_PER_DAY,
        },
        ProcessInstance: { assignes: [{ uuid: "someone-else" }] },
      },
    ];
    const [row] = combineInboxResponses(items, user, noopT);
    expect(row.sla).toBe("-");
  });

  it("shows '-' for a POC when the ticket is assigned to someone else", () => {
    const poc = buildUser({ uuid: "user-1", roles: [{ code: "LIVELIHOOD_POC" }] });
    const items: InboxItem[] = [
      {
        businessObject: {
          incident: {
            incidentId: "INC-1",
            incidentType: "streetlight",
            applicationStatus: "PENDING_FOR_RESOLUTION",
            tenantId: "livelihood",
          },
          slaRemaining: SLA_MS_PER_DAY,
        },
        ProcessInstance: { assignes: [{ uuid: "someone-else" }] },
      },
    ];
    const [row] = combineInboxResponses(items, poc, noopT);
    expect(row.sla).toBe("-");
  });

  it("builds the asset label from boundaryCode, falling back to '-'", () => {
    const withBoundary = combineInboxResponses(
      [buildItem({ boundaryCode: "B1" })],
      buildUser(),
      noopT,
      );
    const withoutBoundary = combineInboxResponses([buildItem()], buildUser(), noopT);
    expect(withBoundary[0].assetLabel).toBe("BOUNDARY_B1");
    expect(withoutBoundary[0].assetLabel).toBe("-");
  });

  it("falls back taskOwner and endUser to '-' when absent", () => {
    const [row] = combineInboxResponses([buildItem()], buildUser(), noopT);
    expect(row.taskOwner).toBe("-");
    expect(row.endUser).toBe("-");
  });

  it("uses the reporter's name for endUser when present", () => {
    const [row] = combineInboxResponses(
      [buildItem({ reporter: { name: "Reporter One" } })],
      buildUser(),
      noopT,
      );
    expect(row.endUser).toBe("Reporter One");
  });

  it("flags potentialDuplicate only for LIVELIHOOD_POC users when the incident is marked as a duplicate", () => {
    const poc = buildUser({ roles: [{ code: "LIVELIHOOD_POC" }] });
    const nonPoc = buildUser({ roles: [{ code: "COMPLAINT_RESOLVER" }] });

    const [pocRow] = combineInboxResponses(
      [buildItem({ isPotentialDuplicate: true })],
      poc,
      noopT,
      );
    const [nonPocRow] = combineInboxResponses(
      [buildItem({ isPotentialDuplicate: true })],
      nonPoc,
      noopT,
      );

    expect(pocRow.potentialDuplicate).toBe(true);
    expect(nonPocRow.potentialDuplicate).toBe(false);
  });

  it("handles a missing incident by falling back to blank defaults", () => {
    const items: InboxItem[] = [{ businessObject: {} }];
    const [row] = combineInboxResponses(items, buildUser(), noopT);
    expect(row.incidentId).toBe("");
    expect(row.status).toBe("");
  });
});

describe("normalizeInboxResponse", () => {
  it("defaults total/items/statusArray when the response omits them", () => {
    expect(normalizeInboxResponse({ items: [], totalCount: 0 })).toEqual({
      total: 0,
      items: [],
      statusArray: [],
      nearingSlaCount: undefined,
    });
  });

  it("passes through provided values", () => {
    const result = normalizeInboxResponse({
      items: [buildItem()],
      totalCount: 5,
      statusMap: [{ statusid: "OPEN", count: 2 }],
      nearingSlaCount: 3,
    });
    expect(result.total).toBe(5);
    expect(result.items).toHaveLength(1);
    expect(result.statusArray).toEqual([{ statusid: "OPEN", count: 2 }]);
    expect(result.nearingSlaCount).toBe(3);
  });
});

describe("sumStatusCounts", () => {
  const statusArray: InboxStatusMapEntry[] = [
    { statusid: "OPEN", count: 3 },
    { statusid: "CLOSED", count: 5 },
    { statusid: "PENDING", count: 2 },
  ];

  it("sums counts only for the requested statuses", () => {
    expect(sumStatusCounts(statusArray, ["OPEN", "PENDING"])).toBe(5);
  });

  it("returns 0 when statusArray is undefined", () => {
    expect(sumStatusCounts(undefined, ["OPEN"])).toBe(0);
  });

  it("returns 0 when no entries match the requested statuses", () => {
    expect(sumStatusCounts(statusArray, ["UNKNOWN"])).toBe(0);
  });

  it("treats a missing count as 0", () => {
    expect(
      sumStatusCounts([{ statusid: "OPEN", count: undefined as unknown as number }], ["OPEN"]),
    ).toBe(0);
  });
});
