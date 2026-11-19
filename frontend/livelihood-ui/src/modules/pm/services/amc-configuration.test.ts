import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { createAmcConfigurations, searchAmcConfigurations, updateAmcConfigurations, updateAmcFieldStaff } from "./amc-configuration";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: () => "livelihood", apiClient: { post: vi.fn(), get: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset();
});

describe("searchAmcConfigurations", () => {
  it("posts the criteria with the tenant and paging, and returns the response verbatim", async () => {
    const body = { AmcConfigurations: [{ id: "amc-1" }], TotalCount: 1 };
    vi.mocked(apiClient.post).mockResolvedValue({ data: body });

    const result = await searchAmcConfigurations(
      { activityFacilityIds: ["row-1"], statuses: ["ACTIVE"] },
      { limit: 50 },
      "token-1",
    );

    expect(result).toBe(body);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/asset-amc/v1/configuration/_search",
      {
        RequestInfo: expect.objectContaining({ authToken: "token-1" }),
        searchCriteria: { activityFacilityIds: ["row-1"], statuses: ["ACTIVE"], tenantId: "livelihood" },
      },
      { params: { tenantId: "livelihood", limit: 50, offset: 0 } },
    );
  });
});

describe("updateAmcConfigurations", () => {
  it("posts the minimal rows and returns the response verbatim", async () => {
    const body = { AmcConfigurations: [{ id: "amc-1" }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: body });
    const updates = [{ tenantId: "livelihood", id: "amc-1", visitFrequencyMonths: 12, durationMonths: 24 }];

    const result = await updateAmcConfigurations(updates, "token-1");

    expect(result).toBe(body);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/asset-amc/v1/configuration/_update",
      { RequestInfo: expect.objectContaining({ authToken: "token-1" }), AmcConfigurations: updates },
      { params: { tenantId: "livelihood" } },
    );
  });
});

describe("updateAmcFieldStaff", () => {
  it("posts the field staff updates and returns the response verbatim", async () => {
    const body = { AmcFieldStaffUpdates: [{ activityFacilityId: "row-1", outcome: "CHANGED" }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: body });
    const updates = [{ tenantId: "livelihood", activityFacilityId: "row-1", fieldStaffUserId: "s2" }];

    await expect(updateAmcFieldStaff(updates, "token-1")).resolves.toBe(body);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/asset-amc/v1/configuration/field-staff/_update",
      { RequestInfo: expect.objectContaining({ authToken: "token-1" }), AmcFieldStaffUpdates: updates },
      { params: { tenantId: "livelihood" } },
    );
  });
});

describe("createAmcConfigurations", () => {
  it("posts the rows and returns the response verbatim", async () => {
    const body = { AmcConfigurations: [{ id: "amc-1" }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: body });
    const rows = [
      {
        tenantId: "livelihood",
        activityFacilityId: "af1",
        visitFrequencyMonths: 6,
        durationMonths: 12,
        vendorOrgId: "org-1",
        amcFieldStaffId: "s1",
      },
    ];

    await expect(createAmcConfigurations(rows, "token-1")).resolves.toBe(body);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/asset-amc/v1/configuration/_create",
      { RequestInfo: expect.objectContaining({ authToken: "token-1" }), AmcConfigurations: rows },
      { params: { tenantId: "livelihood" } },
    );
  });
});
