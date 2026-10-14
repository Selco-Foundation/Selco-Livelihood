import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../stores/auth-store";

vi.mock("../api/hrms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/hrms")>();
  return {
    ...actual,
    searchHrmsEmployees: vi.fn(),
  };
});

import { searchHrmsEmployees } from "../api/hrms";
import {
  filterRolesForEmployeeTenant,
  hydrateEmployeeJurisdictions,
} from "./employee-session";

afterEach(() => {
  window.globalConfigs = { getConfig: () => undefined };
  vi.mocked(searchHrmsEmployees).mockReset();
});

describe("filterRolesForEmployeeTenant", () => {
  it("keeps only roles matching the given employee tenant id", () => {
    const user: AuthUser = {
      uuid: "u-1",
      roles: [
        { code: "ROLE_A", tenantId: "pg.city" },
        { code: "ROLE_B", tenantId: "pg.other" },
      ],
    };

    expect(filterRolesForEmployeeTenant(user, "pg.city")).toEqual({
      ...user,
      roles: [{ code: "ROLE_A", tenantId: "pg.city" }],
    });
  });

  it("returns an empty roles array when the user has no roles", () => {
    const user: AuthUser = { uuid: "u-1" };

    expect(filterRolesForEmployeeTenant(user, "pg.city")).toEqual({ ...user, roles: [] });
  });

  it("returns an empty roles array when no role matches the tenant", () => {
    const user: AuthUser = { uuid: "u-1", roles: [{ code: "ROLE_A", tenantId: "pg.other" }] };

    expect(filterRolesForEmployeeTenant(user, "pg.city")).toEqual({ ...user, roles: [] });
  });
});


describe("hydrateEmployeeJurisdictions", () => {
  it("throws when the user has no userName", async () => {
    const user: AuthUser = {};

    await expect(hydrateEmployeeJurisdictions(user, "token-1")).rejects.toThrow(
      "Could not find employee username",
    );
    expect(searchHrmsEmployees).not.toHaveBeenCalled();
  });

  it("searches HRMS employees by the user's username", async () => {
    vi.mocked(searchHrmsEmployees).mockResolvedValue([
      { code: "EMP1", jurisdictions: [{ boundaryType: "District", boundary: "D1" }] },
    ]);
    const user: AuthUser = { userName: "EMP1" };

    await hydrateEmployeeJurisdictions(user, "token-1");

    expect(searchHrmsEmployees).toHaveBeenCalledWith({ codes: "EMP1" }, "token-1", user);
  });

  it("throws when no HRMS employee is found", async () => {
    vi.mocked(searchHrmsEmployees).mockResolvedValue([]);
    const user: AuthUser = { userName: "EMP1" };

    await expect(hydrateEmployeeJurisdictions(user, "token-1")).rejects.toThrow(
      "Could not find HRMS employee",
    );
  });

  it("throws when the HRMS employee has no jurisdictions", async () => {
    vi.mocked(searchHrmsEmployees).mockResolvedValue([{ code: "EMP1", jurisdictions: [] }]);
    const user: AuthUser = { userName: "EMP1" };

    await expect(hydrateEmployeeJurisdictions(user, "token-1")).rejects.toThrow(
      "Could not find HRMS employee jurisdictions",
    );
  });

  it("returns the HRMS employee together with its built jurisdiction boundaries", async () => {
    const hrmsUser = {
      code: "EMP1",
      jurisdictions: [
        { boundaryType: "District", boundary: "D1" },
        { boundaryType: "Block", boundary: "B1" },
      ],
    };
    vi.mocked(searchHrmsEmployees).mockResolvedValue([hrmsUser]);
    const user: AuthUser = { userName: "EMP1" };

    const result = await hydrateEmployeeJurisdictions(user, "token-1");

    expect(result).toEqual({
      hrmsUser,
      boundaries: { district: ["D1"], block: ["B1"] },
    });
  });
});
