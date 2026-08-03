/**
 * Unit tests for src/modules/im/constants/workflow.ts.
 *
 * This module is pure data -- no functions, no branches, nothing to mock -- so the
 * tests are regression checks that pin down the exact literal values, groupings, and
 * key sets of each exported constant. That matters because several other modules
 * (inbox-transform.ts, use-im-inbox-data.ts, incident.ts, complaint-details.ts) key
 * business logic off membership in these arrays/maps (e.g. "is this status blank-SLA?",
 * "is this role allowed to see this unassigned status?"). A silent edit here -- a status
 * added to the wrong bucket, a role dropped from a mapping -- would not fail to compile
 * (everything is still a valid string), so only a value-level test like this one catches it.
 *
 * No provider wrapper, no i18n instance, and no API/service mocking is needed: these are
 * plain object/array literals imported directly and asserted against expected values.
 */
import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUS,
  BLANK_SLA_STATUSES,
  LIVELIHOOD_INCIDENT_BUSINESS_SERVICE,
  OPEN_DUPLICATE_APPLICATION_STATUSES,
  RESOLVED_APPLICATION_STATUSES,
  ROLE_STATUS_MAPPING,
  TERMINAL_APPLICATION_STATUSES,
} from "./workflow";

// The business-service name string used to scope IM incident lookups against Camunda.
// It's a single literal constant, so the only regression worth guarding is an accidental
// rename/retyping of the string itself.
describe("LIVELIHOOD_INCIDENT_BUSINESS_SERVICE", () => {
  it("is the exact business service identifier used by the IM workflow", () => {
    expect(LIVELIHOOD_INCIDENT_BUSINESS_SERVICE).toBe("LivelihoodIncident");
  });
});

// The canonical set of application status codes an IM incident can be in. Every other
// constant in this file is derived from these values, so this is the anchor: if a status
// string here drifts (e.g. a typo), every derived array/map built from it silently drifts too.
describe("APPLICATION_STATUS", () => {
  it("defines exactly the seven known status codes with self-identical values", () => {
    expect(APPLICATION_STATUS).toEqual({
      PENDING_FOR_RESOLUTION: "PENDING_FOR_RESOLUTION",
      OUT_OF_SCOPE_PENDING_POC: "OUT_OF_SCOPE_PENDING_POC",
      OUT_OF_SCOPE_PENDING_VENDOR: "OUT_OF_SCOPE_PENDING_VENDOR",
      OUT_OF_WARRANTY_PENDING_VENDOR: "OUT_OF_WARRANTY_PENDING_VENDOR",
      RESOLVED: "RESOLVED",
      CLOSED_AFTER_RESOLUTION: "CLOSED_AFTER_RESOLUTION",
      CLOSED_AFTER_DECLINE: "CLOSED_AFTER_DECLINE",
    });
  });

  it("has no extra or missing keys beyond the seven documented statuses", () => {
    expect(Object.keys(APPLICATION_STATUS).sort()).toEqual(
      [
        "PENDING_FOR_RESOLUTION",
        "OUT_OF_SCOPE_PENDING_POC",
        "OUT_OF_SCOPE_PENDING_VENDOR",
        "OUT_OF_WARRANTY_PENDING_VENDOR",
        "RESOLVED",
        "CLOSED_AFTER_RESOLUTION",
        "CLOSED_AFTER_DECLINE",
      ].sort(),
    );
  });
});

// inbox-transform.ts renders "-" for SLA whenever a status is in this list (resolved/closed
// tickets have no meaningful SLA countdown left). Consumed via `.includes(...)` on a readonly
// string array, so both membership and exclusion matter equally.
describe("BLANK_SLA_STATUSES", () => {
  it("contains exactly RESOLVED, CLOSED_AFTER_RESOLUTION, and CLOSED_AFTER_DECLINE", () => {
    expect(BLANK_SLA_STATUSES).toEqual([
      APPLICATION_STATUS.RESOLVED,
      APPLICATION_STATUS.CLOSED_AFTER_RESOLUTION,
      APPLICATION_STATUS.CLOSED_AFTER_DECLINE,
    ]);
  });

  it("does not include any in-progress (pending) status", () => {
    expect(BLANK_SLA_STATUSES).not.toContain(APPLICATION_STATUS.PENDING_FOR_RESOLUTION);
    expect(BLANK_SLA_STATUSES).not.toContain(APPLICATION_STATUS.OUT_OF_SCOPE_PENDING_POC);
    expect(BLANK_SLA_STATUSES).not.toContain(APPLICATION_STATUS.OUT_OF_SCOPE_PENDING_VENDOR);
    expect(BLANK_SLA_STATUSES).not.toContain(APPLICATION_STATUS.OUT_OF_WARRANTY_PENDING_VENDOR);
  });
});

// use-im-inbox-data.ts sums inbox counts for statuses considered "resolved" for dashboard
// tallies. Distinct from BLANK_SLA_STATUSES in one important way: CLOSED_AFTER_DECLINE has no
// SLA either, but a declined ticket isn't a "resolution", so it must be excluded here.
describe("RESOLVED_APPLICATION_STATUSES", () => {
  it("contains exactly RESOLVED and CLOSED_AFTER_RESOLUTION", () => {
    expect(RESOLVED_APPLICATION_STATUSES).toEqual([
      APPLICATION_STATUS.RESOLVED,
      APPLICATION_STATUS.CLOSED_AFTER_RESOLUTION,
    ]);
  });

  it("excludes CLOSED_AFTER_DECLINE (a closed ticket is not necessarily a resolved one)", () => {
    expect(RESOLVED_APPLICATION_STATUSES).not.toContain(APPLICATION_STATUS.CLOSED_AFTER_DECLINE);
  });
});

// complaint-details.ts treats a status as "terminal" (workflow finished, no further actions
// allowed) when it's in this list. Unlike RESOLVED_APPLICATION_STATUSES, RESOLVED itself is
// deliberately excluded: a resolved ticket can still be reopened/closed, so it isn't yet terminal.
describe("TERMINAL_APPLICATION_STATUSES", () => {
  it("contains exactly CLOSED_AFTER_RESOLUTION and CLOSED_AFTER_DECLINE", () => {
    expect(TERMINAL_APPLICATION_STATUSES).toEqual([
      APPLICATION_STATUS.CLOSED_AFTER_RESOLUTION,
      APPLICATION_STATUS.CLOSED_AFTER_DECLINE,
    ]);
  });

  it("excludes RESOLVED, since a resolved ticket is not yet in a closed/terminal state", () => {
    expect(TERMINAL_APPLICATION_STATUSES).not.toContain(APPLICATION_STATUS.RESOLVED);
  });
});

// incident.ts uses this comma-joined string directly as a query-param value (DUPLICATE_STATUSES)
// when asking the backend for "open" duplicate candidates -- i.e. every status that still
// represents an active, non-terminal ticket, including RESOLVED (a resolved ticket can still
// be flagged as a duplicate of another open one) but excluding both CLOSED_* terminal statuses.
describe("OPEN_DUPLICATE_APPLICATION_STATUSES", () => {
  it("is a comma-joined string of the five open/non-terminal statuses in declared order", () => {
    expect(OPEN_DUPLICATE_APPLICATION_STATUSES).toBe(
      "PENDING_FOR_RESOLUTION,OUT_OF_SCOPE_PENDING_POC,OUT_OF_SCOPE_PENDING_VENDOR,OUT_OF_WARRANTY_PENDING_VENDOR,RESOLVED",
    );
  });

  it("excludes both terminal CLOSED_* statuses", () => {
    expect(OPEN_DUPLICATE_APPLICATION_STATUSES).not.toContain(APPLICATION_STATUS.CLOSED_AFTER_RESOLUTION);
    expect(OPEN_DUPLICATE_APPLICATION_STATUSES).not.toContain(APPLICATION_STATUS.CLOSED_AFTER_DECLINE);
  });
});

// inbox-transform.ts consults this map to decide, for an *unassigned* ticket in a given
// status, which role codes are still allowed to see a live SLA countdown (all other roles see
// "-" instead). Only the four still-actionable/pending statuses have an entry; RESOLVED and
// both CLOSED_* statuses are intentionally absent since blank-SLA short-circuits before this
// map is ever consulted for them.
describe("ROLE_STATUS_MAPPING", () => {
  it("maps PENDING_FOR_RESOLUTION to the vendor and complaint-resolver roles", () => {
    expect(ROLE_STATUS_MAPPING[APPLICATION_STATUS.PENDING_FOR_RESOLUTION]).toEqual([
      "LIVELIHOOD_VENDOR",
      "COMPLAINT_RESOLVER",
    ]);
  });

  it("maps OUT_OF_SCOPE_PENDING_POC to the POC role only", () => {
    expect(ROLE_STATUS_MAPPING[APPLICATION_STATUS.OUT_OF_SCOPE_PENDING_POC]).toEqual(["LIVELIHOOD_POC"]);
  });

  it("maps OUT_OF_SCOPE_PENDING_VENDOR to the vendor and complaint-resolver roles", () => {
    expect(ROLE_STATUS_MAPPING[APPLICATION_STATUS.OUT_OF_SCOPE_PENDING_VENDOR]).toEqual([
      "LIVELIHOOD_VENDOR",
      "COMPLAINT_RESOLVER",
    ]);
  });

  it("maps OUT_OF_WARRANTY_PENDING_VENDOR to the vendor and complaint-resolver roles", () => {
    expect(ROLE_STATUS_MAPPING[APPLICATION_STATUS.OUT_OF_WARRANTY_PENDING_VENDOR]).toEqual([
      "LIVELIHOOD_VENDOR",
      "COMPLAINT_RESOLVER",
    ]);
  });

  it("has exactly four entries, with no mapping for RESOLVED or the terminal CLOSED_* statuses", () => {
    expect(Object.keys(ROLE_STATUS_MAPPING).sort()).toEqual(
      [
        APPLICATION_STATUS.PENDING_FOR_RESOLUTION,
        APPLICATION_STATUS.OUT_OF_SCOPE_PENDING_POC,
        APPLICATION_STATUS.OUT_OF_SCOPE_PENDING_VENDOR,
        APPLICATION_STATUS.OUT_OF_WARRANTY_PENDING_VENDOR,
      ].sort(),
    );
    expect(ROLE_STATUS_MAPPING[APPLICATION_STATUS.RESOLVED]).toBeUndefined();
    expect(ROLE_STATUS_MAPPING[APPLICATION_STATUS.CLOSED_AFTER_RESOLUTION]).toBeUndefined();
    expect(ROLE_STATUS_MAPPING[APPLICATION_STATUS.CLOSED_AFTER_DECLINE]).toBeUndefined();
  });
});
