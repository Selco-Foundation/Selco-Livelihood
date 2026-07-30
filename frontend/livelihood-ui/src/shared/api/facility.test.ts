import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { fetchFacilities } from "./facility";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchFacilities", () => {
  it("maps snake_case facility fields to camelCase", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        facilities: [
          {
            boundaryCode: "B1",
            facility_id: "F1",
            facility_status: "ACTIVE",
            facility_name: "Facility One",
          },
        ],
        totalCount: 1,
      }),
    );

    const result = await fetchFacilities(["B1"], "tenant", "token");
    expect(result.facilities).toEqual([
      {
        boundaryCode: "B1",
        facilityId: "F1",
        facilityStatus: "ACTIVE",
        facilityName: "Facility One",
      },
    ]);
    expect(result.total).toBe(1);
  });

  it("defaults missing string fields to empty strings", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ facilities: [{}], totalCount: 1 }),
    );

    const result = await fetchFacilities(["B1"], "tenant", "token");
    expect(result.facilities[0]).toEqual({
      boundaryCode: "",
      facilityId: "",
      facilityStatus: undefined,
      facilityName: undefined,
    });
  });

  it("falls back to an empty facilities array when the response omits it", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({}));

    const result = await fetchFacilities(["B1"], "tenant", "token");
    expect(result.facilities).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("falls back total to facilities.length when totalCount is missing", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        facilities: [{ boundaryCode: "B1" }, { boundaryCode: "B2" }],
      }),
    );

    const result = await fetchFacilities(["B1", "B2"], "tenant", "token");
    expect(result.total).toBe(2);
  });
});
