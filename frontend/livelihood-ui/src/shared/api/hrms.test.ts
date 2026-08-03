/**
 * Unit tests for `searchHrmsEmployee` (src/shared/api/hrms.ts).
 *
 * `searchHrmsEmployee` queries the HRMS service's employee search endpoint
 * with an employee code (passed as a query param) and returns the first
 * matching employee object or null if the response contains no employees.
 *
 * Mocking strategy: `apiClient.post` is spied on with `vi.spyOn` and stubbed
 * via `mockAxiosSuccess` so no real HTTP call is made. Tests verify both the
 * happy path (employee found) and the null fallback (empty result list). No
 * providers/wrappers needed since this is a plain async data-fetching function.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { searchHrmsEmployee } from "./hrms";

afterEach(() => {
  vi.restoreAllMocks();
});

// searchHrmsEmployee(employeeCode, accessToken, user?) posts an HRMS search
// request and returns the first employee from the Employees array, or null
// if the array is empty or absent.
describe("searchHrmsEmployee", () => {
  it("returns the first matching employee", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ Employees: [{ code: "emp1" }] }),
    );
    const result = await searchHrmsEmployee("emp1", "token");
    expect(result).toEqual({ code: "emp1" });
  });

  it("returns null when no employee is found", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ Employees: [] }));
    const result = await searchHrmsEmployee("emp1", "token");
    expect(result).toBeNull();
  });
});
