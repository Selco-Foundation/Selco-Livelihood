/**
 * Unit tests for asset-search.ts.
 *
 * `searchAssetsForFacility` is the only exported function in the source file; it POSTs
 * a facility/tenant search to the asset-registry API via `apiClient` and maps the raw
 * response items into the app's `LivelihoodAsset` shape (defaulting/coalescing missing
 * fields and pulling the first document's fileStore id). Since the function's only
 * external dependency is `apiClient.post`, these tests mock that single call with
 * `vi.spyOn` + `mockAxiosSuccess` (a helper that wraps a payload in an Axios-response-like
 * object) rather than mocking a whole module, then assert on the mapped/returned array.
 * No component wrappers/providers are needed since this is a plain async service function.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { searchAssetsForFacility } from "./asset-search";

afterEach(() => {
  // Restore the apiClient.post spy after every test so mocks don't leak between cases.
  vi.restoreAllMocks();
});

// searchAssetsForFacility(facilityId, tenantId, accessToken, user?, limit?, offset?):
// posts a search request to /asset-registry/v1/asset/_search with the facility/tenant
// criteria, then maps each raw response item to a LivelihoodAsset via `mapAsset`
// (coalescing optional fields to "" / falling back name to assetTypeID, and extracting
// the first document's fileStore as documentFileStoreId). Returns [] if data is missing.
describe("searchAssetsForFacility", () => {
  // Happy path: a fully-populated raw item should map field-for-field into the
  // LivelihoodAsset shape, with unset optional fields (modelNumber, isOperational,
  // documentFileStoreId) coming through as undefined rather than being omitted.
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

  // Business rule (mapAsset): `name` falls back to `assetTypeID` when the raw item has
  // no name, so assets without a display name still show something meaningful.
  it("defaults the name to assetTypeID when name is missing", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess([{ assetTypeID: "streetlight" }]),
    );
    const result = await searchAssetsForFacility("fac-1", "livelihood", "token");
    expect(result[0].name).toBe("streetlight");
  });

  // Business rule (getFirstDocumentFileStore): only the *first* document's fileStore is
  // used as documentFileStoreId, even when multiple documents are attached to the asset.
  it("extracts the first document's fileStore as documentFileStoreId", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess([
        { assetId: "a1", documents: [{ fileStore: "fs-1" }, { fileStore: "fs-2" }] },
      ]),
    );
    const result = await searchAssetsForFacility("fac-1", "livelihood", "token");
    expect(result[0].documentFileStoreId).toBe("fs-1");
  });

  // Guards the `(data ?? []).map(mapAsset)` fallback: when the API responds with no
  // `data` payload (undefined), the function must return [] rather than throwing.
  it("returns an empty array when the response has no data", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess(undefined));
    const result = await searchAssetsForFacility("fac-1", "livelihood", "token");
    expect(result).toEqual([]);
  });
});
