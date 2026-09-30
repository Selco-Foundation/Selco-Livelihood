import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATUS,
  BLANK_SLA_STATUSES,
  OPEN_DUPLICATE_APPLICATION_STATUSES,
  RESOLVED_APPLICATION_STATUSES,
  ROLE_STATUS_MAPPING,
  TERMINAL_APPLICATION_STATUSES,
} from "./workflow";

const ALL_STATUSES = Object.values(APPLICATION_STATUS);

describe("BLANK_SLA_STATUSES", () => {
  it("only contains valid APPLICATION_STATUS values", () => {
    for (const status of BLANK_SLA_STATUSES) {
      expect(ALL_STATUSES).toContain(status);
    }
  });

  it("is a superset of TERMINAL_APPLICATION_STATUSES, since a closed ticket must not show a live SLA", () => {
    for (const status of TERMINAL_APPLICATION_STATUSES) {
      expect(BLANK_SLA_STATUSES).toContain(status);
    }
  });

  it("includes RESOLVED", () => {
    expect(BLANK_SLA_STATUSES).toContain(APPLICATION_STATUS.RESOLVED);
  });
});

describe("RESOLVED_APPLICATION_STATUSES", () => {
  it("only contains valid APPLICATION_STATUS values", () => {
    for (const status of RESOLVED_APPLICATION_STATUSES) {
      expect(ALL_STATUSES).toContain(status);
    }
  });

  it("contains exactly RESOLVED and CLOSED_AFTER_RESOLUTION", () => {
    expect([...RESOLVED_APPLICATION_STATUSES].sort()).toEqual(
      [APPLICATION_STATUS.RESOLVED, APPLICATION_STATUS.CLOSED_AFTER_RESOLUTION].sort(),
    );
  });
});

describe("TERMINAL_APPLICATION_STATUSES", () => {
  it("only contains valid APPLICATION_STATUS values", () => {
    for (const status of TERMINAL_APPLICATION_STATUSES) {
      expect(ALL_STATUSES).toContain(status);
    }
  });

  it("intersects RESOLVED_APPLICATION_STATUSES in exactly CLOSED_AFTER_RESOLUTION", () => {
    const intersection = TERMINAL_APPLICATION_STATUSES.filter((status) =>
      (RESOLVED_APPLICATION_STATUSES as readonly string[]).includes(status),
    );
    expect(intersection).toEqual([APPLICATION_STATUS.CLOSED_AFTER_RESOLUTION]);
  });

  it("does not include the still-open RESOLVED status", () => {
    expect(TERMINAL_APPLICATION_STATUSES).not.toContain(APPLICATION_STATUS.RESOLVED);
  });
});

describe("OPEN_DUPLICATE_APPLICATION_STATUSES", () => {
  it("is a comma-joined string of exactly the non-terminal, non-closed statuses", () => {
    expect(OPEN_DUPLICATE_APPLICATION_STATUSES).toBe(
      [
        APPLICATION_STATUS.PENDING_FOR_RESOLUTION,
        APPLICATION_STATUS.OUT_OF_SCOPE_PENDING_POC,
        APPLICATION_STATUS.OUT_OF_SCOPE_PENDING_VENDOR,
        APPLICATION_STATUS.OUT_OF_WARRANTY_PENDING_VENDOR,
        APPLICATION_STATUS.RESOLVED,
      ].join(","),
    );
  });

  it("excludes every terminal status, since a closed ticket can't count as an open duplicate", () => {
    const included = OPEN_DUPLICATE_APPLICATION_STATUSES.split(",");
    for (const status of TERMINAL_APPLICATION_STATUSES) {
      expect(included).not.toContain(status);
    }
  });
});

describe("ROLE_STATUS_MAPPING", () => {
  it("only keys on valid APPLICATION_STATUS values", () => {
    for (const key of Object.keys(ROLE_STATUS_MAPPING)) {
      expect(ALL_STATUSES).toContain(key);
    }
  });

  it("maps every key to a non-empty list of role codes", () => {
    for (const roles of Object.values(ROLE_STATUS_MAPPING)) {
      expect(roles.length).toBeGreaterThan(0);
      for (const role of roles) {
        expect(typeof role).toBe("string");
        expect(role).toBeTruthy();
      }
    }
  });

  it("never maps a terminal or resolved status, since those tickets aren't unassigned-pending anymore", () => {
    for (const key of Object.keys(ROLE_STATUS_MAPPING)) {
      expect(RESOLVED_APPLICATION_STATUSES as readonly string[]).not.toContain(key);
      expect(TERMINAL_APPLICATION_STATUSES as readonly string[]).not.toContain(key);
    }
  });
});
