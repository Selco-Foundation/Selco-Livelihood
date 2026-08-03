/**
 * Unit tests for src/modules/im/constants/inbox-statuses.ts.
 *
 * This module exports a single runtime value, `ORDERED_INBOX_STATUSES` -- a plain
 * `as const` array of `{ code, statuses }` groups. There is no function, no branch,
 * and no conditional logic to exercise, so these are pure regression checks that pin
 * down the exact literal values, the declared order, and the shape of each entry.
 *
 * That matters because two components key real behavior off this exact array:
 *   - InboxStatus.tsx maps over it (in array order) to build the sorted status-count
 *     rows shown in the inbox sidebar, summing `statusMap` counts per group via each
 *     entry's `statuses` list. Array order here IS display order.
 *   - InboxFilter.tsx builds the "Ticket Status" filter menu from it (again, in array
 *     order) and uses `find((item) => item.code === option.code)` to resolve which
 *     underlying `statuses` a checkbox toggle/selection actually applies to.
 * A status accidentally dropped, duplicated, reordered, or given a `statuses` array
 * that doesn't match its own `code` would still compile (everything stays a valid
 * string) but would silently break sidebar ordering or filter-toggle behavior. This
 * file also cross-checks membership against `APPLICATION_STATUS` in ./workflow.ts --
 * the two files are meant to describe the same seven statuses, so a drift between
 * them (e.g. workflow.ts gains a new status but inbox-statuses.ts isn't updated)
 * would only be caught by a test like this.
 *
 * Testing approach: no mocking, no provider wrapper, and no rendering is needed --
 * the module is imported directly and its exported array is asserted against exact
 * expected values, shape, and order.
 */
import { describe, expect, it } from "vitest";
import { ORDERED_INBOX_STATUSES } from "./inbox-statuses";
import { APPLICATION_STATUS } from "./workflow";

// ORDERED_INBOX_STATUSES is the full, ordered list of IM ticket-status groups shown
// in the inbox status sidebar and the "Ticket Status" filter menu. It expects no
// input -- it is a static, `as const` array consumed directly by array order and by
// `.find((item) => item.code === ...)` lookups.
describe("ORDERED_INBOX_STATUSES", () => {
  it("contains exactly the seven expected status groups in declared display order", () => {
    // Asserting the full array in one go (rather than entry-by-entry) catches value
    // drift, reordering, and accidental addition/removal of entries in one assertion.
    // Order matters here: InboxStatus.tsx and InboxFilter.tsx both map over this array
    // directly to build their on-screen ordering.
    expect(ORDERED_INBOX_STATUSES).toEqual([
      { code: "PENDING_FOR_RESOLUTION", statuses: ["PENDING_FOR_RESOLUTION"] },
      { code: "OUT_OF_SCOPE_PENDING_POC", statuses: ["OUT_OF_SCOPE_PENDING_POC"] },
      { code: "OUT_OF_SCOPE_PENDING_VENDOR", statuses: ["OUT_OF_SCOPE_PENDING_VENDOR"] },
      { code: "OUT_OF_WARRANTY_PENDING_VENDOR", statuses: ["OUT_OF_WARRANTY_PENDING_VENDOR"] },
      { code: "RESOLVED", statuses: ["RESOLVED"] },
      { code: "CLOSED_AFTER_RESOLUTION", statuses: ["CLOSED_AFTER_RESOLUTION"] },
      { code: "CLOSED_AFTER_DECLINE", statuses: ["CLOSED_AFTER_DECLINE"] },
    ]);
  });

  it("has no duplicate group codes", () => {
    // InboxFilter.tsx resolves a menu option back to its group via
    // `ORDERED_INBOX_STATUSES.find((item) => item.code === option.code)`. A duplicate
    // code would make `find` always resolve to the first match and silently hide the
    // second entry from ever being selectable.
    const codes = ORDERED_INBOX_STATUSES.map((group) => group.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("gives every group a single-element statuses array equal to its own code", () => {
    // Business rule (as currently implemented): every group is a 1:1 mapping of a
    // single underlying status to itself -- there is no group that folds multiple raw
    // statuses under one display code. InboxStatus.tsx's count-summing loop and
    // InboxFilter.tsx's checkbox-group toggle both rely on `statuses` accurately
    // reflecting the underlying status codes represented by `code`.
    for (const group of ORDERED_INBOX_STATUSES) {
      expect(group.statuses).toEqual([group.code]);
    }
  });

  it("does not contain any duplicate underlying status values across all groups", () => {
    // InboxStatus.tsx flattens every group's `statuses` into a single
    // `countedStatusCodes` list to decide which raw statuses have already been
    // counted, then adds any leftover uncounted status as an "unknown" row. A raw
    // status appearing in two groups would get double-counted in that sidebar total.
    const allStatuses = ORDERED_INBOX_STATUSES.flatMap((group) => group.statuses);
    expect(new Set(allStatuses).size).toBe(allStatuses.length);
  });

  it("matches APPLICATION_STATUS in ./workflow.ts exactly, in the same order", () => {
    // These two constant files independently enumerate the same seven IM ticket
    // statuses. They must stay in lockstep: workflow.ts drives status-derived business
    // rules (SLA blanking, terminal/resolved sets, role visibility), while this file
    // drives sidebar/filter display order. A status added to one but not the other
    // would compile fine yet silently desync the UI from the workflow rules.
    const inboxCodes = ORDERED_INBOX_STATUSES.map((group) => group.code);
    const workflowCodes = Object.values(APPLICATION_STATUS);
    expect(inboxCodes).toEqual(workflowCodes);
  });

  it("has exactly seven entries, matching the number of documented APPLICATION_STATUS codes", () => {
    expect(ORDERED_INBOX_STATUSES).toHaveLength(7);
    expect(ORDERED_INBOX_STATUSES).toHaveLength(Object.keys(APPLICATION_STATUS).length);
  });
});
