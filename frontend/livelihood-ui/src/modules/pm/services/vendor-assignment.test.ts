import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { searchVendorAssignment, validateVendorAssignment } from "./vendor-assignment";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

describe("searchVendorAssignment", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("maps sites/totalAssets/assignable/planStatus with defaults for missing fields", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await searchVendorAssignment("plan-1", "token-1");

    expect(result).toEqual({ sites: [], totalAssets: 0, assignable: false, planStatus: undefined });
  });

  it("returns the sites/assets/flags the server sent", async () => {
    const sites = [{ facilityId: "f1", assets: [{ componentType: "SOLAR", componentSequence: 1 }] }];
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { Sites: sites, TotalAssets: 1, assignable: true, planStatus: "DRAFT" },
    });

    const result = await searchVendorAssignment("plan-1", "token-1");

    expect(result).toEqual({ sites, totalAssets: 1, assignable: true, planStatus: "DRAFT" });
  });

  it("posts the fieldPlanId and tenantId from the given user", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await searchVendorAssignment("plan-1", "token-1", { tenantId: "tenant-1" } as never);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/vendor-assignment/_search",
      expect.objectContaining({ VendorAssignment: { tenantId: "tenant-1", fieldPlanId: "plan-1" } }),
    );
  });
});

describe("validateVendorAssignment", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns valid=true and no errors on a clean validation", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { valid: true } });

    const result = await validateVendorAssignment("plan-1", []);

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("surfaces per-row Errors and defaults valid to false when missing", async () => {
    const errors = [{ message: "REVIEWER_MISSING", facilityId: "f1", componentType: "SOLAR" }];
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Errors: errors } });

    const result = await validateVendorAssignment("plan-1", []);

    expect(result).toEqual({ valid: false, errors });
  });

  it("posts the assignments under Assignments", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { valid: true } });
    const assignments = [{ facilityId: "f1", componentType: "SOLAR" as const, componentSequence: 1 }];

    await validateVendorAssignment("plan-1", assignments);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/vendor-assignment/_validate",
      expect.objectContaining({ Assignments: assignments }),
    );
  });
});
