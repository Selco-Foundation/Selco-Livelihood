import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { tenantId } from "../config/global-config";
import { searchHrmsEmployees } from "./hrms";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));
vi.mock("../config/global-config", () => ({
  tenantId: vi.fn(),
}));

describe("searchHrmsEmployees", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("state-tenant");
  });

  it("posts with RequestInfo and spreads criteria alongside tenantId() into params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Employees: [] } });
    const user = { uuid: "u1", name: "Reviewer" };
    const criteria = { codes: "E1,E2", roles: "FIELD_OFFICER", isActive: true, boundaryCodes: "B1" };

    await searchHrmsEmployees(criteria, "token-1", user);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/egov-hrms/employees/_search",
      {
        RequestInfo: expect.objectContaining({
          apiId: "Rainmaker",
          authToken: "token-1",
          userInfo: user,
        }),
      },
      {
        params: {
          tenantId: "state-tenant",
          codes: "E1,E2",
          roles: "FIELD_OFFICER",
          isActive: true,
          boundaryCodes: "B1",
        },
      },
    );
  });

  it("returns response.data.Employees unmodified", async () => {
    const employees = [{ code: "E1", user: { uuid: "u1", name: "Employee One" } }];
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Employees: employees } });

    const result = await searchHrmsEmployees({}, "token-1");

    expect(result).toBe(employees);
  });

  it("returns an empty array when the response has no Employees field", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await searchHrmsEmployees({}, "token-1");

    expect(result).toEqual([]);
  });
});
