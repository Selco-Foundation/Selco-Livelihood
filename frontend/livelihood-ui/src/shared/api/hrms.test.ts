import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { searchHrmsEmployee } from "./hrms";

afterEach(() => {
  vi.restoreAllMocks();
});

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
