import { describe, expect, it } from "vitest";
import {
  canCreateIncident,
  hasImAccess,
  hasRole,
  IM_ROLES,
  isAssigneeScopedUser,
  isEndUser,
} from "./access";

describe("IM_ROLES", () => {
  it("contains exactly the expected IM role codes", () => {
    expect(IM_ROLES).toEqual([
      "COMPLAINT_RESOLVER",
      "LIVELIHOOD_POC",
      "COMPLAINANT",
      "LIVELIHOOD_VENDOR",
      "VIEWER",
    ]);
  });
});

describe("hasRole", () => {
  it("returns true when a role with the given code is present", () => {
    expect(hasRole([{ code: "COMPLAINANT" }], "COMPLAINANT")).toBe(true);
  });

  it("returns true when only one of several roles matches", () => {
    expect(hasRole([{ code: "OTHER" }, { code: "COMPLAINANT" }], "COMPLAINANT")).toBe(true);
  });

  it("returns false when no role matches", () => {
    expect(hasRole([{ code: "OTHER" }], "COMPLAINANT")).toBe(false);
  });

  it("returns false for an empty roles array", () => {
    expect(hasRole([], "COMPLAINANT")).toBe(false);
  });

  it("returns false when roles is undefined", () => {
    expect(hasRole(undefined, "COMPLAINANT")).toBe(false);
  });
});

describe("hasImAccess", () => {
  it("returns true when a role matches an IM role code", () => {
    expect(hasImAccess([{ code: "LIVELIHOOD_POC" }])).toBe(true);
  });

  it("returns true when only one of several roles matches", () => {
    expect(hasImAccess([{ code: "SOME_OTHER_ROLE" }, { code: "VIEWER" }])).toBe(true);
  });

  it("returns false when no role matches", () => {
    expect(hasImAccess([{ code: "SOME_OTHER_ROLE" }])).toBe(false);
  });

  it("returns false for an empty roles array", () => {
    expect(hasImAccess([])).toBe(false);
  });

  it("returns false when roles is undefined", () => {
    expect(hasImAccess(undefined)).toBe(false);
  });

  it("returns false when a role has no code", () => {
    expect(hasImAccess([{}])).toBe(false);
  });
});

describe("isEndUser", () => {
  it("returns true when every role is EMPLOYEE or COMPLAINANT", () => {
    expect(isEndUser([{ code: "EMPLOYEE" }, { code: "COMPLAINANT" }])).toBe(true);
  });

  it("returns false when a role outside EMPLOYEE/COMPLAINANT is present", () => {
    expect(isEndUser([{ code: "EMPLOYEE" }, { code: "LIVELIHOOD_POC" }])).toBe(false);
  });

  it("returns true for an empty roles array (vacuous every)", () => {
    expect(isEndUser([])).toBe(true);
  });

  it("returns false when roles is undefined", () => {
    expect(isEndUser(undefined)).toBe(false);
  });
});

describe("canCreateIncident", () => {
  it("returns true for a COMPLAINANT", () => {
    expect(canCreateIncident([{ code: "COMPLAINANT" }])).toBe(true);
  });

  it("returns true for a LIVELIHOOD_POC", () => {
    expect(canCreateIncident([{ code: "LIVELIHOOD_POC" }])).toBe(true);
  });

  it("returns false for a role outside the allowed set", () => {
    expect(canCreateIncident([{ code: "VIEWER" }])).toBe(false);
  });

  it("returns false when roles is undefined", () => {
    expect(canCreateIncident(undefined)).toBe(false);
  });
});

describe("isAssigneeScopedUser", () => {
  it("returns true for a LIVELIHOOD_VENDOR", () => {
    expect(isAssigneeScopedUser([{ code: "LIVELIHOOD_VENDOR" }])).toBe(true);
  });

  it("returns true for a COMPLAINT_RESOLVER", () => {
    expect(isAssigneeScopedUser([{ code: "COMPLAINT_RESOLVER" }])).toBe(true);
  });

  it("returns false for a role outside the allowed set", () => {
    expect(isAssigneeScopedUser([{ code: "COMPLAINANT" }])).toBe(false);
  });

  it("returns false when roles is undefined", () => {
    expect(isAssigneeScopedUser(undefined)).toBe(false);
  });
});
