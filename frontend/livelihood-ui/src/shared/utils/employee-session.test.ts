import { afterEach, describe, expect, it, vi } from "vitest";
import * as hrmsApi from "../api/hrms";
import type { AuthUser } from "../stores/auth-store";
import {
  assertEmployeeRolesAllowed,
  filterRolesForEmployeeTenant,
  hydrateEmployeeJurisdictions,
} from "./employee-session";

afterEach(() => {
  vi.restoreAllMocks();
  window.globalConfigs = { getConfig: () => undefined };
});

describe("filterRolesForEmployeeTenant", () => {
  it("keeps only roles matching the employee tenant", () => {
    const user: AuthUser = {
      uuid: "u1",
      roles: [
        { code: "A", tenantId: "livelihood.sub" },
        { code: "B", tenantId: "livelihood.other" },
      ],
    };
    const result = filterRolesForEmployeeTenant(user, "livelihood.sub");
    expect(result.roles).toEqual([{ code: "A", tenantId: "livelihood.sub" }]);
  });

  it("returns an empty roles array when the user has no roles", () => {
    const result = filterRolesForEmployeeTenant({ uuid: "u1" }, "livelihood.sub");
    expect(result.roles).toEqual([]);
  });

  it("preserves the rest of the user object", () => {
    const user: AuthUser = { uuid: "u1", name: "Test", roles: [] };
    const result = filterRolesForEmployeeTenant(user, "livelihood.sub");
    expect(result.uuid).toBe("u1");
    expect(result.name).toBe("Test");
  });
});

describe("assertEmployeeRolesAllowed", () => {
  it("does not throw when there are no configured blocked roles", () => {
    expect(() =>
      assertEmployeeRolesAllowed({ uuid: "u1", roles: [{ code: "ANY_ROLE" }] }),
    ).not.toThrow();
  });

  it("does not throw when the user has none of the blocked roles", () => {
    window.globalConfigs = { getConfig: () => ["BLOCKED_ROLE"] };
    expect(() =>
      assertEmployeeRolesAllowed({ uuid: "u1", roles: [{ code: "ALLOWED_ROLE" }] }),
    ).not.toThrow();
  });

  it("throws when the user has a blocked role", () => {
    window.globalConfigs = { getConfig: () => ["BLOCKED_ROLE"] };
    expect(() =>
      assertEmployeeRolesAllowed({ uuid: "u1", roles: [{ code: "BLOCKED_ROLE" }] }),
    ).toThrow("ES_ERROR_USER_NOT_PERMITTED");
  });

  it("ignores a non-array INVALIDROLES config", () => {
    window.globalConfigs = { getConfig: () => "not-an-array" as never };
    expect(() =>
      assertEmployeeRolesAllowed({ uuid: "u1", roles: [{ code: "ANY_ROLE" }] }),
    ).not.toThrow();
  });
});

describe("hydrateEmployeeJurisdictions", () => {
  it("throws when the user has no userName", async () => {
    await expect(hydrateEmployeeJurisdictions({ uuid: "u1" }, "token")).rejects.toThrow(
      "Could not find employee username",
    );
  });

  it("throws when no HRMS employee is found", async () => {
    vi.spyOn(hrmsApi, "searchHrmsEmployee").mockResolvedValue(null);
    await expect(
      hydrateEmployeeJurisdictions({ uuid: "u1", userName: "emp1" }, "token"),
    ).rejects.toThrow("Could not find HRMS employee");
  });

  it("throws when the HRMS employee has no jurisdictions", async () => {
    vi.spyOn(hrmsApi, "searchHrmsEmployee").mockResolvedValue({
      code: "hrms-1",
      jurisdictions: [],
    });
    await expect(
      hydrateEmployeeJurisdictions({ uuid: "u1", userName: "emp1" }, "token"),
    ).rejects.toThrow("Could not find HRMS employee jurisdictions");
  });

  it("builds jurisdiction boundaries from the HRMS employee's jurisdictions on success", async () => {
    vi.spyOn(hrmsApi, "searchHrmsEmployee").mockResolvedValue({
      code: "hrms-1",
      jurisdictions: [{ boundaryType: "State", boundary: "S1" }],
    });

    const result = await hydrateEmployeeJurisdictions(
      { uuid: "u1", userName: "emp1" },
      "token",
    );

    expect(result.boundaries).toEqual({ state: ["S1"] });
    expect(result.hrmsUser.code).toBe("hrms-1");
  });
});
