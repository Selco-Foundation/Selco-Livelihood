/**
 * Unit tests for inbox-defaults.ts.
 *
 * Both functions under test are pure and derive their output purely from an
 * `AuthUser`'s `roles` array (via `isAssigneeScopedUser`, which treats
 * LIVELIHOOD_VENDOR and COMPLAINT_RESOLVER as "assignee-scoped" roles), so no
 * mocking, providers, or wrappers are needed -- each test just builds a plain
 * `AuthUser` (or passes `null`) and asserts on the returned filter object.
 */
import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/shared";
import { buildDefaultInboxRoleFilters, buildSummaryRoleFilters } from "./inbox-defaults";

// buildDefaultInboxRoleFilters builds the initial ImInboxFilters (workflow +
// PGR filters) shown when the inbox first loads. Assignee-scoped users
// (vendor / complaint resolver) should only see items assigned to them, so
// their own uuid is preinstalled into wfFilters.assignee; everyone else gets
// an empty assignee filter (i.e. unscoped, sees everything). The pgrfilters
// bucket is always the same fixed set of empty arrays regardless of role.
describe("buildDefaultInboxRoleFilters", () => {
  it("scopes the assignee filter to the user for an assignee-scoped role (vendor)", () => {
    const user: AuthUser = { uuid: "user-1", roles: [{ code: "LIVELIHOOD_VENDOR" }] };
    const result = buildDefaultInboxRoleFilters(user);
    expect(result.wfFilters?.assignee).toEqual([{ code: "user-1" }]);
  });

  // COMPLAINT_RESOLVER is the second (and only other) role treated as
  // assignee-scoped by isAssigneeScopedUser, so it must behave identically
  // to the vendor case above rather than falling through to the empty-filter branch.
  it("scopes the assignee filter for a COMPLAINT_RESOLVER role too", () => {
    const user: AuthUser = { uuid: "user-2", roles: [{ code: "COMPLAINT_RESOLVER" }] };
    const result = buildDefaultInboxRoleFilters(user);
    expect(result.wfFilters?.assignee).toEqual([{ code: "user-2" }]);
  });

  // LIVELIHOOD_POC is not in the assignee-scoped role set, so the function
  // should take the "everyone" branch and leave assignee empty rather than
  // scoping to this user's uuid.
  it("leaves the assignee filter empty for a non-scoped role (POC)", () => {
    const user: AuthUser = { uuid: "user-3", roles: [{ code: "LIVELIHOOD_POC" }] };
    const result = buildDefaultInboxRoleFilters(user);
    expect(result.wfFilters?.assignee).toEqual([]);
  });

  // A null user has no roles, so isAssigneeScopedUser(undefined) must be
  // treated as false -- confirms the function doesn't throw on missing user
  // and safely defaults to the unscoped (empty assignee) branch.
  it("leaves the assignee filter empty for a null user", () => {
    const result = buildDefaultInboxRoleFilters(null);
    expect(result.wfFilters?.assignee).toEqual([]);
  });

  // pgrfilters is a fixed shape independent of role/scoping -- verifies all
  // six buckets are always present and empty on the default filters, using a
  // null user as a representative (non-scoped) case.
  it("always includes the full set of empty pgr filter buckets", () => {
    const result = buildDefaultInboxRoleFilters(null);
    expect(result.pgrfilters).toEqual({
      assetType: [],
      facility: [],
      state: [],
      district: [],
      block: [],
      applicationStatus: [],
    });
  });
});

// buildSummaryRoleFilters builds the (much smaller) filter object used for
// summary/count queries. It mirrors the same assignee-scoping rule as
// buildDefaultInboxRoleFilters but returns a bare `{ assignee }` key instead
// of the full wfFilters/pgrfilters shape -- and omits the key entirely (empty
// object) rather than emitting an empty array when the user isn't scoped.
describe("buildSummaryRoleFilters", () => {
  it("returns an assignee filter for an assignee-scoped user", () => {
    const user: AuthUser = { uuid: "user-1", roles: [{ code: "LIVELIHOOD_VENDOR" }] };
    expect(buildSummaryRoleFilters(user)).toEqual({ assignee: "user-1" });
  });

  // Non-scoped role (POC) must produce an empty object, not e.g. { assignee: "" },
  // so downstream query params don't accidentally filter by an empty string.
  it("returns an empty object for a non-scoped user", () => {
    const user: AuthUser = { uuid: "user-1", roles: [{ code: "LIVELIHOOD_POC" }] };
    expect(buildSummaryRoleFilters(user)).toEqual({});
  });

  // Same null-safety guarantee as buildDefaultInboxRoleFilters: a missing user
  // must not throw and must fall back to the unscoped empty-object result.
  it("returns an empty object for a null user", () => {
    expect(buildSummaryRoleFilters(null)).toEqual({});
  });
});
