import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared";
import { createBoundary, fetchBoundaryLgdCodes } from "./boundary";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn() } };
});

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({ data: {} });
});

describe("createBoundary", () => {
  it("sends filled LGD codes and leaves empty ones out, so the columns stay NULL", async () => {
    await createBoundary(
      { tenantId: "livelihood", code: "INDIA_GOA", lgdStateCode: "30", lgdDistrictCode: "", lgdBlockCode: " " },
      "token-1",
    );

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as { Boundary: Record<string, unknown>[] };
    expect(body.Boundary[0]).toEqual({ tenantId: "livelihood", code: "INDIA_GOA", geometry: null, lgdStateCode: "30" });
  });
});

describe("fetchBoundaryLgdCodes", () => {
  it("makes no request when there is nothing to look up", async () => {
    expect(await fetchBoundaryLgdCodes(["", ""], "token-1")).toEqual(new Map());
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("returns the stored codes keyed by boundary code", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { Boundary: [{ code: "INDIA_KARNATAKA", lgdStateCode: "29" }] },
    });

    const codes = await fetchBoundaryLgdCodes(["INDIA_KARNATAKA"], "token-1");

    expect(codes.get("INDIA_KARNATAKA")).toMatchObject({ lgdStateCode: "29" });
    expect(vi.mocked(apiClient.post).mock.calls[0][2]).toMatchObject({
      params: { codes: "INDIA_KARNATAKA" },
    });
  });
});
