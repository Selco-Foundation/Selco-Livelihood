import { describe, expect, it } from "vitest";
import {
  canCreateIncident,
  hasImAccess,
  hasRole,
  isAssigneeScopedUser,
  isEndUser,
} from "./access";

describe("hasRole", () => {
  it("returns false when roles is undefined", () => {
    expect(hasRole(undefined, "EMPLOYEE")).toBe(false);
  });

  it("returns true when a role with the given code exists", () => {
    expect(hasRole([{ code: "EMPLOYEE" }, { code: "VIEWER" }], "VIEWER")).toBe(true);
  });

  it("returns false when no role matches", () => {
    expect(hasRole([{ code: "EMPLOYEE" }], "VIEWER")).toBe(false);
  });
});

describe("hasImAccess", () => {
  it("returns false for undefined/empty roles", () => {
    expect(hasImAccess(undefined)).toBe(false);
    expect(hasImAccess([])).toBe(false);
  });

  it("returns true when any role is one of the IM roles", () => {
    expect(hasImAccess([{ code: "EMPLOYEE" }, { code: "LIVELIHOOD_POC" }])).toBe(true);
  });

  it("returns false when no role is an IM role", () => {
    expect(hasImAccess([{ code: "EMPLOYEE" }])).toBe(false);
  });
});

describe("isEndUser", () => {
  it("returns false when roles is undefined (vacuous-true guarded by ?? false)", () => {
    expect(isEndUser(undefined)).toBe(false);
  });

  it("returns true for an empty roles array (Array.prototype.every is vacuously true)", () => {
    expect(isEndUser([])).toBe(true);
  });

  it("returns true when every role is EMPLOYEE or COMPLAINANT", () => {
    expect(isEndUser([{ code: "EMPLOYEE" }, { code: "COMPLAINANT" }])).toBe(true);
  });

  it("returns false when any role is outside EMPLOYEE/COMPLAINANT", () => {
    expect(isEndUser([{ code: "EMPLOYEE" }, { code: "LIVELIHOOD_VENDOR" }])).toBe(false);
  });
});

describe("canCreateIncident", () => {
  it("returns true for a COMPLAINANT", () => {
    expect(canCreateIncident([{ code: "COMPLAINANT" }])).toBe(true);
  });

  it("returns true for a LIVELIHOOD_POC", () => {
    expect(canCreateIncident([{ code: "LIVELIHOOD_POC" }])).toBe(true);
  });

  it("returns false for roles with no incident-create permission", () => {
    expect(canCreateIncident([{ code: "VIEWER" }])).toBe(false);
  });

  it("returns false for undefined roles", () => {
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

  it("returns false for other roles", () => {
    expect(isAssigneeScopedUser([{ code: "LIVELIHOOD_POC" }])).toBe(false);
  });
});
