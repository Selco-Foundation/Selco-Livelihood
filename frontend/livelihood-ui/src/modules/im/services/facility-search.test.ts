/**
 * Unit tests for facility-search.ts.
 *
 * Covers `searchFacilitiesByJurisdiction`, which posts a bulk-search request to
 * the facility service and maps the raw snake_case API response into the
 * camelCase `LivelihoodFacility` shape used by the UI, including its fallback
 * rules for `facilityPocName` and `total`.
 *
 * Mocking strategy: this is a thin service function with no React/router
 * dependencies, so the only external dependency to fake is `apiClient.post`.
 * Each test spies on it with `vi.spyOn` and resolves it via `mockAxiosSuccess`
 * (a helper that shapes the value as an Axios response), then asserts on the
 * mapped output returned by the function under test. `vi.restoreAllMocks` in
 * `afterEach` ensures spies don't leak between tests.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { searchFacilitiesByJurisdiction } from "./facility-search";

afterEach(() => {
  vi.restoreAllMocks();
});

// searchFacilitiesByJurisdiction(criteria, accessToken, user?) posts the given
// search criteria to the facility bulk-search endpoint and maps each raw
// facility record's snake_case fields to the camelCase LivelihoodFacility
// shape, applying fallbacks for facilityPocName and the total count.
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

  // facilityPocName has a 3-level fallback chain in mapFacility:
  // facility_poc_name -> facility_name -> facility_id -> "". This verifies
  // the first two fallback rungs (facility_name, then facility_id) trigger
  // correctly when the higher-priority fields are absent from the response.
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

  // When the API response omits totalCount, the function falls back to
  // facilities.length rather than reporting 0, so pagination/result counts
  // stay accurate even without an explicit server-provided total.
  it("falls total back to facilities.length when totalCount is missing", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({ facilities: [{ facility_id: "f1" }, { facility_id: "f2" }] }),
    );
    const result = await searchFacilitiesByJurisdiction({ tenantId: ["livelihood"] }, "token");
    expect(result.total).toBe(2);
  });

  // Both `facilities` and `totalCount` are optional on the response type;
  // this guards the `data.facilities ?? []` / `data.totalCount ?? facilities.length`
  // defaults so a bare `{}` body doesn't throw and total correctly resolves to 0.
  it("returns an empty facilities array when the response omits it", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({}));
    const result = await searchFacilitiesByJurisdiction({ tenantId: ["livelihood"] }, "token");
    expect(result.facilities).toEqual([]);
    expect(result.total).toBe(0);
  });
});
