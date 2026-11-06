import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { fetchActivityFacilityById } from "./activity-detail";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

describe("fetchActivityFacilityById", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts a single-id ActivityFacility search with limit 1, offset 0", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { facility: [] } });

    await fetchActivityFacilityById("activity-1", "tenant-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/activity/v1/activities/_search",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        ActivityFacility: { tenantId: "tenant-1", ids: ["activity-1"] },
      }),
      { params: { tenantId: "tenant-1", offset: 0, limit: 1 } },
    );
  });

  it("returns the first (and only) facility row verbatim", async () => {
    const row = {
      activityFacility: {
        id: "activity-1",
        componentType: "SOLAR",
        status: "SUBMITTED_BY_FIELD_STAFF",
        billOfMaterial: { reportNumber: "RPT-1" },
      },
      workflow: [{ id: "wf-1" }],
      transactions: [{ processInstanceId: "wf-1" }],
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { facility: [row] } });

    const result = await fetchActivityFacilityById("activity-1", "tenant-1", "token-1");

    expect(result).toBe(row);
  });

  it("returns undefined when the search finds no matching row", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { facility: [] } });

    const result = await fetchActivityFacilityById("activity-1", "tenant-1", "token-1");

    expect(result).toBeUndefined();
  });
});
