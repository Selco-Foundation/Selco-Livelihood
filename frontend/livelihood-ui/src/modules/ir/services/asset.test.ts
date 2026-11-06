import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "@/shared";
import { searchAssetsForActivityFacility } from "./asset";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    apiClient: { post: vi.fn(), get: vi.fn() },
  };
});

describe("searchAssetsForActivityFacility", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the criteria and default limit/offset params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [] });

    await searchAssetsForActivityFacility("facility-1", "tenant-1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/asset-registry/v1/asset/_search",
      expect.objectContaining({
        RequestInfo: expect.objectContaining({ apiId: "Rainmaker", authToken: "token-1" }),
        criteria: { tenantId: "tenant-1", activityFacilityID: "facility-1", includeChildren: true },
      }),
      { params: { limit: 1000, offset: 0 } },
    );
  });

  it("passes explicit limit/offset through to params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [] });

    await searchAssetsForActivityFacility("facility-1", "tenant-1", "token-1", null, 25, 50);

    expect(apiClient.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      { params: { limit: 25, offset: 50 } },
    );
  });

  it("includes userInfo in RequestInfo when a user is provided, omits it otherwise", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [] });
    const user = { uuid: "u1", name: "Reviewer" };

    await searchAssetsForActivityFacility("facility-1", "tenant-1", "token-1", user);
    const withUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as { RequestInfo: Record<string, unknown> };
    expect(withUserBody.RequestInfo).toEqual(
      expect.objectContaining({ userInfo: user }),
    );

    vi.mocked(apiClient.post).mockClear();
    await searchAssetsForActivityFacility("facility-1", "tenant-1", "token-1");
    const withoutUserBody = vi.mocked(apiClient.post).mock.calls[0][1] as { RequestInfo: Record<string, unknown> };
    expect(withoutUserBody.RequestInfo).not.toHaveProperty("userInfo");
  });

  it("returns the raw response data unmodified", async () => {
    const items = [{ assetId: "a1", assetTypeID: "PANEL", name: "Panel" }];
    vi.mocked(apiClient.post).mockResolvedValue({ data: items });

    const result = await searchAssetsForActivityFacility("facility-1", "tenant-1", "token-1");

    expect(result).toEqual(items);
    expect(result).toBe(items);
  });

  it("returns an empty array when the response data is null", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: null });

    const result = await searchAssetsForActivityFacility("facility-1", "tenant-1", "token-1");

    expect(result).toEqual([]);
  });
});
