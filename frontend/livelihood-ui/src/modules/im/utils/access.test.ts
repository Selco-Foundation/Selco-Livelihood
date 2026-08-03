/**
 * Unit tests for the IM (Incident Management) role/access helpers in `./access.ts`.
 *
 * These are all small, pure, synchronous predicate functions over a caller's
 * `roles` array (each role being `{ code?: string }`), so no mocking, spies,
 * or test-wrapper providers are needed here -- every case simply calls the
 * function with a literal roles array (or `undefined`) and asserts the
 * boolean result. Coverage focuses on the documented role-code constants
 * (`IM_ROLES`, `INCIDENT_CREATE_ROLES`) plus the edge cases baked into each
 * function's use of optional chaining / `some` / `every` (undefined roles,
 * empty arrays, and the vacuous-truth behavior of `Array.prototype.every`).
 */
import { describe, expect, it } from "vitest";
import {
  canCreateIncident,
  hasImAccess,
  hasRole,
  isAssigneeScopedUser,
  isEndUser,
} from "./access";

// hasRole: generic helper that returns true if `roles` contains an entry whose
// `code` matches the given `code`. Returns false (never throws) when `roles`
// is undefined, via `?? false` after the optional-chained `.some()`.
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

// hasImAccess: true if `roles` is non-empty AND at least one role's code is a
// member of the fixed IM_ROLES list (COMPLAINT_RESOLVER, LIVELIHOOD_POC,
// COMPLAINANT, LIVELIHOOD_VENDOR, VIEWER). Unlike `hasRole`/`isEndUser`, this
// short-circuits to false explicitly for an empty/undefined roles array
// rather than relying on `some`'s natural empty-array behavior.
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

// isEndUser: true only if every role's code is EMPLOYEE or COMPLAINANT (i.e.
// the user has no elevated/IM-side roles mixed in). Uses `Array.prototype
// .every`, so an empty roles array is vacuously true, and `?? false` guards
// the undefined-roles case (which would otherwise be vacuously true too).
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

// canCreateIncident: true if `roles` includes COMPLAINANT or LIVELIHOOD_POC
// (the fixed INCIDENT_CREATE_ROLES list), via `hasRole` under the hood --
// so it inherits `hasRole`'s "false for undefined roles" fallback.
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

// isAssigneeScopedUser: true if the user holds either LIVELIHOOD_VENDOR or
// COMPLAINT_RESOLVER -- roles whose incident visibility is scoped to items
// they are assigned to, rather than the full unscoped list.
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
