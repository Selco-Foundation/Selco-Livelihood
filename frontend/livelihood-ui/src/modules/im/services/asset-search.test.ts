import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { searchAssetsForFacility } from "./asset-search";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

describe("searchAssetsForFacility", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the criteria under `criteria` with default limit/offset", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [] });

    await searchAssetsForFacility("facility-1", "tenant-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/asset-registry/v1/asset/_search",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        criteria: { tenantId: "tenant-1", facilityID: "facility-1" },
      }),
      { params: { limit: 50, offset: 0 } },
    );
  });

  it("passes explicit limit/offset through to params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [] });

    await searchAssetsForFacility("facility-1", "tenant-1", "token-1", null, 25, 50);

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      { params: { limit: 25, offset: 50 } },
    );
  });

  it("includes userInfo in RequestInfo when a user is provided, omits it otherwise", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [] });
    const user = { uuid: "u1", name: "Reviewer" };

    await searchAssetsForFacility("facility-1", "tenant-1", "token-1", user);
    const withUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as {
      RequestInfo: Record<string, unknown>;
    };
    expect(withUserBody.RequestInfo).toEqual(expect.objectContaining({ userInfo: user }));

    vi.mocked(apiClient.post).mockClear();
    await searchAssetsForFacility("facility-1", "tenant-1", "token-1");
    const withoutUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as {
      RequestInfo: Record<string, unknown>;
    };
    expect(withoutUserBody.RequestInfo).not.toHaveProperty("userInfo");
  });

  it("maps each raw response item to the LivelihoodAsset domain shape", async () => {
    const raw = [
      {
        assetId: "a1",
        tenantId: "tenant-1",
        facilityID: "facility-1",
        boundaryCode: "b1",
        assetTypeID: "PANEL",
        name: "Solar Panel",
        serialNumber: "SN1",
        modelNumber: "MN1",
        isOperational: true,
        documents: [{ fileStore: "fs1" }, { fileStore: "fs2" }],
      },
    ];
    vi.mocked(apiClient.post).mockResolvedValue({ data: raw });

    const result = await searchAssetsForFacility("facility-1", "tenant-1", "token-1");

    expect(result).toEqual([
      {
        assetId: "a1",
        tenantId: "tenant-1",
        facilityId: "facility-1",
        boundaryCode: "b1",
        assetTypeId: "PANEL",
        name: "Solar Panel",
        serialNumber: "SN1",
        modelNumber: "MN1",
        isOperational: true,
        documentFileStoreId: "fs1",
      },
    ]);
  });

  it("falls back name to assetTypeID and documentFileStoreId to undefined when missing", async () => {
    const raw = [{ assetId: "a1", assetTypeID: "PANEL" }];
    vi.mocked(apiClient.post).mockResolvedValue({ data: raw });

    const result = await searchAssetsForFacility("facility-1", "tenant-1", "token-1");

    expect(result[0].name).toBe("PANEL");
    expect(result[0].documentFileStoreId).toBeUndefined();
  });

  it("returns an empty array when the response data is null", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: null });

    const result = await searchAssetsForFacility("facility-1", "tenant-1", "token-1");

    expect(result).toEqual([]);
  });
});
