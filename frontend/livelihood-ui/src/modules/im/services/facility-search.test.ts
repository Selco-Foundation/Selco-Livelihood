import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { searchFacilitiesByJurisdiction } from "./facility-search";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchFacilitiesByJurisdiction", () => {
  it("maps snake_case facility fields to camelCase", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        facilities: [
          {
            tenant_id: "livelihood",
            facility_id: "fac-1",
            facility_name: "Facility One",
            facility_poc_name: "Poc One",
            boundaryCode: "B1",
          },
        ],
        totalCount: 1,
      }),
    );

    const result = await searchFacilitiesByJurisdiction(
      { tenantId: ["livelihood"] },
      "token",
    );

    expect(result.facilities[0]).toMatchObject({
      tenantId: "livelihood",
      facilityId: "fac-1",
      facilityName: "Facility One",
      facilityPocName: "Poc One",
      boundaryCode: "B1",
    });
    expect(result.total).toBe(1);
  });

  it("falls facilityPocName back to facility_name, then facility_id, then empty string", async () => {
    vi.spyOn(apiClient, "post").mockReturnValueOnce(
      mockAxiosSuccess({ facilities: [{ facility_name: "Fallback Name" }] }),
    );
    const withNameFallback = await searchFacilitiesByJurisdiction(
      { tenantId: ["livelihood"] },
      "token",
    );
    expect(withNameFallback.facilities[0].facilityPocName).toBe("Fallback Name");

    vi.spyOn(apiClient, "post").mockReturnValueOnce(
      mockAxiosSuccess({ facilities: [{ facility_id: "fac-only-id" }] }),
    );
    const withIdFallback = await searchFacilitiesByJurisdiction(
      { tenantId: ["livelihood"] },
      "token",
    );
    expect(withIdFallback.facilities[0].facilityPocName).toBe("fac-only-id");
  });

  it("falls total back to facilities.length when totalCount is missing", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ facilities: [{ facility_id: "f1" }, { facility_id: "f2" }] }),
    );
    const result = await searchFacilitiesByJurisdiction({ tenantId: ["livelihood"] }, "token");
    expect(result.total).toBe(2);
  });

  it("returns an empty facilities array when the response omits it", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({}));
    const result = await searchFacilitiesByJurisdiction({ tenantId: ["livelihood"] }, "token");
    expect(result.facilities).toEqual([]);
    expect(result.total).toBe(0);
  });
});
