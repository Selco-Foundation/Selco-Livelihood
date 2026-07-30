import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { searchAssetsForFacility } from "./asset-search";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("searchAssetsForFacility", () => {
  it("maps raw asset fields to the LivelihoodAsset shape", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess([
        {
          assetId: "a1",
          tenantId: "livelihood",
          facilityID: "fac-1",
          boundaryCode: "B1",
          assetTypeID: "streetlight",
          name: "Streetlight 1",
          serialNumber: "SN1",
        },
      ]),
    );

    const result = await searchAssetsForFacility("fac-1", "livelihood", "token");

    expect(result).toEqual([
      {
        assetId: "a1",
        tenantId: "livelihood",
        facilityId: "fac-1",
        boundaryCode: "B1",
        assetTypeId: "streetlight",
        name: "Streetlight 1",
        serialNumber: "SN1",
        modelNumber: undefined,
        isOperational: undefined,
        documentFileStoreId: undefined,
      },
    ]);
  });

  it("defaults the name to assetTypeID when name is missing", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess([{ assetTypeID: "streetlight" }]),
    );
    const result = await searchAssetsForFacility("fac-1", "livelihood", "token");
    expect(result[0].name).toBe("streetlight");
  });

  it("extracts the first document's fileStore as documentFileStoreId", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess([
        { assetId: "a1", documents: [{ fileStore: "fs-1" }, { fileStore: "fs-2" }] },
      ]),
    );
    const result = await searchAssetsForFacility("fac-1", "livelihood", "token");
    expect(result[0].documentFileStoreId).toBe("fs-1");
  });

  it("returns an empty array when the response has no data", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess(undefined));
    const result = await searchAssetsForFacility("fac-1", "livelihood", "token");
    expect(result).toEqual([]);
  });
});
