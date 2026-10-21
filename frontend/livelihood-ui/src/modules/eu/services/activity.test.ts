import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { searchFacilityActivities } from "./activity";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

describe("searchFacilityActivities", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("maps activityFacility.componentType through to the activity row", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        facility: [{ activityFacility: { id: "activity-1", componentType: "MACHINE" } }],
        totalCount: 1,
      },
    });

    const result = await searchFacilityActivities({ tenantId: "tenant-1" }, {}, "token-1");

    expect(result.activities[0].componentType).toBe("MACHINE");
  });

  it("leaves componentType undefined when the row has none", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { facility: [{ activityFacility: { id: "activity-1" } }], totalCount: 1 },
    });

    const result = await searchFacilityActivities({ tenantId: "tenant-1" }, {}, "token-1");

    expect(result.activities[0].componentType).toBeUndefined();
  });

  it("returns an empty list and zero total when the response has no facility rows", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await searchFacilityActivities({ tenantId: "tenant-1" }, {}, "token-1");

    expect(result).toEqual({ activities: [], total: 0 });
  });
});
