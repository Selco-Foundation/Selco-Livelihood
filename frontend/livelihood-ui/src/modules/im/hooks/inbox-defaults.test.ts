import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/shared";
import { buildDefaultInboxRoleFilters, buildSummaryRoleFilters } from "./inbox-defaults";

describe("buildDefaultInboxRoleFilters", () => {
  it("scopes the assignee filter to the user for an assignee-scoped role (vendor)", () => {
    const user: AuthUser = { uuid: "user-1", roles: [{ code: "LIVELIHOOD_VENDOR" }] };
    const result = buildDefaultInboxRoleFilters(user);
    expect(result.wfFilters?.assignee).toEqual([{ code: "user-1" }]);
  });

  it("scopes the assignee filter for a COMPLAINT_RESOLVER role too", () => {
    const user: AuthUser = { uuid: "user-2", roles: [{ code: "COMPLAINT_RESOLVER" }] };
    const result = buildDefaultInboxRoleFilters(user);
    expect(result.wfFilters?.assignee).toEqual([{ code: "user-2" }]);
  });

  it("leaves the assignee filter empty for a non-scoped role (POC)", () => {
    const user: AuthUser = { uuid: "user-3", roles: [{ code: "LIVELIHOOD_POC" }] };
    const result = buildDefaultInboxRoleFilters(user);
    expect(result.wfFilters?.assignee).toEqual([]);
  });

  it("leaves the assignee filter empty for a null user", () => {
    const result = buildDefaultInboxRoleFilters(null);
    expect(result.wfFilters?.assignee).toEqual([]);
  });

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

describe("buildSummaryRoleFilters", () => {
  it("returns an assignee filter for an assignee-scoped user", () => {
    const user: AuthUser = { uuid: "user-1", roles: [{ code: "LIVELIHOOD_VENDOR" }] };
    expect(buildSummaryRoleFilters(user)).toEqual({ assignee: "user-1" });
  });

  it("returns an empty object for a non-scoped user", () => {
    const user: AuthUser = { uuid: "user-1", roles: [{ code: "LIVELIHOOD_POC" }] };
    expect(buildSummaryRoleFilters(user)).toEqual({});
  });

  it("returns an empty object for a null user", () => {
    expect(buildSummaryRoleFilters(null)).toEqual({});
  });
});
