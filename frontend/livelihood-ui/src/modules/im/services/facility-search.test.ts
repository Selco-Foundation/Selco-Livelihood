import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { searchFacilitiesByJurisdiction } from "./facility-search";
import type { FacilityBulkSearchCriteria } from "../types/facility-asset";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

describe("searchFacilitiesByJurisdiction", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the criteria under `Facility` with no extra params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const criteria: FacilityBulkSearchCriteria = { tenantId: ["tenant-1"] };

    await searchFacilitiesByJurisdiction(criteria, "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/facility-service/v2/facility/_bulk-search",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        Facility: criteria,
      }),
    );
    expect(vi.mocked(apiClient.post).mock.calls[0]).toHaveLength(2);
  });

  it("includes userInfo in RequestInfo when a user is provided, omits it otherwise", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const user = { uuid: "u1", name: "Reviewer" };
    const criteria: FacilityBulkSearchCriteria = { tenantId: ["tenant-1"] };

    await searchFacilitiesByJurisdiction(criteria, "token-1", user);
    const withUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as {
      RequestInfo: Record<string, unknown>;
    };
    expect(withUserBody.RequestInfo).toEqual(expect.objectContaining({ userInfo: user }));

    vi.mocked(apiClient.post).mockClear();
    await searchFacilitiesByJurisdiction(criteria, "token-1");
    const withoutUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as {
      RequestInfo: Record<string, unknown>;
    };
    expect(withoutUserBody.RequestInfo).not.toHaveProperty("userInfo");
  });

  it("maps each raw facility to the LivelihoodFacility domain shape", async () => {
    const raw = {
      facilities: [
        {
          tenant_id: "tenant-1",
          facility_id: "f1",
          facility_name: "Facility One",
          facility_poc_name: "Poc Name",
          facility_poc_username: "poc-user",
          facility_poc_phone: "9999999999",
          facility_poc_email: "poc@example.com",
          end_user_uuid: "eu1",
          boundaryCode: "b1",
          facility_status: "ACTIVE",
          isOnmReady: true,
          address: { district: "d1", block: "bl1", city: "c1" },
        },
      ],
      totalCount: 5,
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: raw });

    const result = await searchFacilitiesByJurisdiction({ tenantId: ["tenant-1"] }, "token-1");

    expect(result).toEqual({
      facilities: [
        {
          tenantId: "tenant-1",
          facilityId: "f1",
          facilityName: "Facility One",
          facilityPocName: "Poc Name",
          facilityPocUsername: "poc-user",
          facilityPocPhone: "9999999999",
          facilityPocEmail: "poc@example.com",
          endUserUuid: "eu1",
          boundaryCode: "b1",
          facilityStatus: "ACTIVE",
          address: { district: "d1", block: "bl1", city: "c1" },
          isOnmReady: true,
        },
      ],
      total: 5,
    });
  });

  it("falls back facilityPocName to facility_name then facility_id when missing", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { facilities: [{ facility_id: "f1", facility_name: "Facility One" }] },
    });

    const withName = await searchFacilitiesByJurisdiction({ tenantId: ["tenant-1"] }, "token-1");
    expect(withName.facilities[0].facilityPocName).toBe("Facility One");

    vi.mocked(apiClient.post).mockResolvedValue({
      data: { facilities: [{ facility_id: "f1" }] },
    });
    const withoutName = await searchFacilitiesByJurisdiction({ tenantId: ["tenant-1"] }, "token-1");
    expect(withoutName.facilities[0].facilityPocName).toBe("f1");
  });

  it("falls back total to facilities.length when totalCount is missing, and to [] when facilities is missing", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { facilities: [{ facility_id: "f1" }, { facility_id: "f2" }] },
    });
    const withFacilities = await searchFacilitiesByJurisdiction(
      { tenantId: ["tenant-1"] },
      "token-1",
    );
    expect(withFacilities.total).toBe(2);

    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const empty = await searchFacilitiesByJurisdiction({ tenantId: ["tenant-1"] }, "token-1");
    expect(empty).toEqual({ facilities: [], total: 0 });
  });
});
