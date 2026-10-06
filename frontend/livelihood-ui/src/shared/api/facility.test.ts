import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { fetchFacilities } from "./facility";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));

describe("fetchFacilities", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts a bulk-search with tenantId wrapped in an array, boundaryCodes, and onm-ready/non-paginated flags", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { facilities: [], totalCount: 0 } });
    const user = { uuid: "u1", name: "Reviewer" };

    await fetchFacilities(["B1", "B2"], "tenant-1", "token-1", user);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/facility-service/v2/facility/_bulk-search",
      {
        RequestInfo: expect.objectContaining({
          apiId: "Rainmaker",
          authToken: "token-1",
          userInfo: user,
        }),
        Facility: {
          tenantId: ["tenant-1"],
          boundaryCodes: ["B1", "B2"],
          isOnmReady: true,
          sendNonPaginatedResponse: true,
        },
      },
    );
  });

  it("maps snake_case facility fields to camelCase, defaulting missing boundaryCode/facilityId to empty strings", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        facilities: [
          {
            boundaryCode: "B1",
            facility_id: "f1",
            facility_status: "ACTIVE",
            facility_name: "Facility One",
          },
          {},
        ],
        totalCount: 2,
      },
    });

    const result = await fetchFacilities(["B1"], "tenant-1", "token-1");

    expect(result.facilities).toEqual([
      { boundaryCode: "B1", facilityId: "f1", facilityStatus: "ACTIVE", facilityName: "Facility One" },
      { boundaryCode: "", facilityId: "", facilityStatus: undefined, facilityName: undefined },
    ]);
    expect(result.total).toBe(2);
  });

  it("falls back to the mapped facilities length when totalCount is absent", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        facilities: [{ boundaryCode: "B1", facility_id: "f1" }],
      },
    });

    const result = await fetchFacilities(["B1"], "tenant-1", "token-1");

    expect(result.total).toBe(1);
  });

  it("returns an empty list and zero total when the response has no facilities", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await fetchFacilities(["B1"], "tenant-1", "token-1");

    expect(result).toEqual({ facilities: [], total: 0 });
  });
});
