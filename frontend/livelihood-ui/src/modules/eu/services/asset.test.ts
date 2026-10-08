import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { searchAssets, updateAssetVendorMapping } from "./asset";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

describe("searchAssets", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the given criteria verbatim, including includeChildren", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [] });

    await searchAssets(
      { tenantId: "tenant-1", facilityID: "facility-1", includeChildren: true },
      { limit: 10, offset: 0 },
      "token-1",
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      "/asset-registry/v1/asset/_search",
      expect.objectContaining({
        criteria: { tenantId: "tenant-1", facilityID: "facility-1", includeChildren: true },
      }),
      { params: { limit: 10, offset: 0 } },
    );
  });

  it("maps vendorId and recursively maps nested children to FacilityAsset", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: [
        {
          assetId: "a1",
          assetTypeID: "SOLAR",
          vendorId: "vendor-1",
          children: [
            { assetId: "a1-panel", assetTypeID: "PANEL", vendorId: "vendor-1", parentId: "a1" },
            { assetId: "a1-battery", assetTypeID: "BATTERY", parentId: "a1" },
          ],
        },
        { assetId: "a2", assetTypeID: "MACHINE" },
      ],
    });

    const result = await searchAssets({ tenantId: "tenant-1", facilityID: "facility-1" }, {}, "token-1");

    expect(result).toEqual([
      {
        assetId: "a1",
        assetType: "SOLAR",
        serialNumber: undefined,
        modelNumber: undefined,
        brand: undefined,
        capacity: undefined,
        installationDate: undefined,
        isOperational: undefined,
        vendorId: "vendor-1",
        vendor: undefined,
        children: [
          {
            assetId: "a1-panel",
            assetType: "PANEL",
            serialNumber: undefined,
            modelNumber: undefined,
            brand: undefined,
            capacity: undefined,
            installationDate: undefined,
            isOperational: undefined,
            vendorId: "vendor-1",
            vendor: undefined,
            children: undefined,
          },
          {
            assetId: "a1-battery",
            assetType: "BATTERY",
            serialNumber: undefined,
            modelNumber: undefined,
            brand: undefined,
            capacity: undefined,
            installationDate: undefined,
            isOperational: undefined,
            vendorId: undefined,
            vendor: undefined,
            children: undefined,
          },
        ],
      },
      {
        assetId: "a2",
        assetType: "MACHINE",
        serialNumber: undefined,
        modelNumber: undefined,
        brand: undefined,
        capacity: undefined,
        installationDate: undefined,
        isOperational: undefined,
        vendorId: undefined,
        vendor: undefined,
        children: undefined,
      },
    ]);
  });

  it("maps the resolved vendor enrichment object when present", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: [
        {
          assetId: "a1",
          assetTypeID: "SOLAR",
          vendorId: "vendor-1",
          vendor: {
            userId: "vendor-1",
            userName: "test_vendor",
            name: "Test Vendor",
            mobileNumber: "8861235521",
            organisationId: "org-1",
            organisationName: "Test Installation Vendor",
          },
        },
      ],
    });

    const result = await searchAssets({ tenantId: "tenant-1", facilityID: "facility-1" }, {}, "token-1");

    expect(result[0].vendor).toEqual({
      userId: "vendor-1",
      name: "Test Vendor",
      organisationId: "org-1",
      organisationName: "Test Installation Vendor",
    });
  });
});

describe("updateAssetVendorMapping", () => {
  it("resolves a static success response without calling apiClient, since the real endpoint isn't ready yet", async () => {
    vi.mocked(apiClient.post).mockReset();

    const result = await updateAssetVendorMapping({ assetId: "a1", vendorId: "vendor-1" }, "token-1");

    expect(result).toEqual({ status: "success" });
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
