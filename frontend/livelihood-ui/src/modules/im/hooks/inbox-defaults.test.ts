import { describe, expect, it } from "vitest";
import { buildDefaultInboxRoleFilters, buildSummaryRoleFilters } from "./inbox-defaults";
import type { AuthUser } from "@/shared";

const scopedUser: AuthUser = { uuid: "user-1", roles: [{ code: "LIVELIHOOD_VENDOR" }] };
const resolverUser: AuthUser = { uuid: "user-2", roles: [{ code: "COMPLAINT_RESOLVER" }] };
const unscopedUser: AuthUser = { uuid: "user-3", roles: [{ code: "LIVELIHOOD_POC" }] };

describe("buildDefaultInboxRoleFilters", () => {
  it("scopes wfFilters.assignee to the user's uuid for a LIVELIHOOD_VENDOR", () => {
    expect(buildDefaultInboxRoleFilters(scopedUser)).toEqual({
      wfFilters: { assignee: [{ code: "user-1" }] },
      pgrfilters: {
        assetType: [],
        facility: [],
        state: [],
        district: [],
        block: [],
        applicationStatus: [],
      },
    });
  });

  it("scopes wfFilters.assignee to the user's uuid for a COMPLAINT_RESOLVER", () => {
    expect(buildDefaultInboxRoleFilters(resolverUser)).toEqual({
      wfFilters: { assignee: [{ code: "user-2" }] },
      pgrfilters: {
        assetType: [],
        facility: [],
        state: [],
        district: [],
        block: [],
        applicationStatus: [],
      },
    });
  });

  it("leaves wfFilters.assignee empty for a user without an assignee-scoped role", () => {
    expect(buildDefaultInboxRoleFilters(unscopedUser)).toEqual({
      wfFilters: { assignee: [] },
      pgrfilters: {
        assetType: [],
        facility: [],
        state: [],
        district: [],
        block: [],
        applicationStatus: [],
      },
    });
  });

  it.each([[null], [undefined]])("leaves wfFilters.assignee empty when user is %s", (user) => {
    expect(buildDefaultInboxRoleFilters(user)).toEqual({
      wfFilters: { assignee: [] },
      pgrfilters: {
        assetType: [],
        facility: [],
        state: [],
        district: [],
        block: [],
        applicationStatus: [],
      },
    });
  });
});

describe("buildSummaryRoleFilters", () => {
  it("returns { assignee: uuid } for an assignee-scoped user", () => {
    expect(buildSummaryRoleFilters(scopedUser)).toEqual({ assignee: "user-1" });
  });

  it("returns {} for a user without an assignee-scoped role", () => {
    expect(buildSummaryRoleFilters(unscopedUser)).toEqual({});
  });

  it.each([[null], [undefined]])("returns {} when user is %s", (user) => {
    expect(buildSummaryRoleFilters(user)).toEqual({});
  });
});
