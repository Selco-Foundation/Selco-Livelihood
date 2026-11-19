import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { searchPlanActivityFacilities } from "./activity-facility";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: () => "livelihood", apiClient: { post: vi.fn(), get: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
});

describe("searchPlanActivityFacilities", () => {
  it("searches one plan's installation rows and returns the response verbatim", async () => {
    const body = { totalCount: 1, facility: [{ activityFacility: { id: "row-1" } }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: body });

    const result = await searchPlanActivityFacilities(
      { fieldPlanIds: ["plan-1"], componentTypes: ["SOLAR"] },
      { limit: 500 },
      "token-1",
    );

    expect(result).toBe(body);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/activities/_search",
      {
        RequestInfo: expect.objectContaining({ authToken: "token-1" }),
        ActivityFacility: { tenantId: "livelihood", fieldPlanIds: ["plan-1"], componentTypes: ["SOLAR"] },
      },
      { params: { tenantId: "livelihood", limit: 500, offset: 0 } },
    );
  });
});
