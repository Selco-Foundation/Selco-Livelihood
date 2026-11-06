import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { tenantId } from "../config/global-config";
import { fetchBoundaryRelations } from "./boundary";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));
vi.mock("../config/global-config", () => ({
  tenantId: vi.fn(),
}));

describe("fetchBoundaryRelations", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("state-tenant");
  });

  it("posts the search criteria with tenantId(), hierarchyType SELCO, and both children/parents included", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const user = { uuid: "u1", name: "Reviewer" };

    await fetchBoundaryRelations(["S1"], "token-1", user);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/boundary-service/boundary-relationships/v2/_search",
      {
        RequestInfo: expect.objectContaining({
          apiId: "Rainmaker",
          authToken: "token-1",
          userInfo: user,
        }),
        BoundaryRelationship: {
          tenantId: "state-tenant",
          includeChildren: true,
          includeParents: true,
          hierarchyType: "SELCO",
          codes: ["S1"],
        },
      },
    );
  });

  it("compiles a nested boundary tree into a hierarchy grouped by boundaryType, tracking each node's parentCode", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        TenantBoundary: [
          {
            boundary: [
              {
                code: "S1",
                boundaryType: "State",
                children: [
                  {
                    code: "D1",
                    boundaryType: "District",
                    children: [{ code: "B1", boundaryType: "Block" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await fetchBoundaryRelations(["S1"], "token-1");

    expect(result).toEqual({
      states: [{ code: "S1", parentCode: "" }],
      districts: [{ code: "D1", parentCode: "S1" }],
      blocks: [{ code: "B1", parentCode: "D1" }],
      facilities: undefined,
    });
  });

  it("dedupes repeated codes of the same boundaryType and skips nodes missing code or boundaryType", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        TenantBoundary: [
          {
            boundary: [
              {
                code: "D1",
                boundaryType: "District",
                children: [
                  { code: "B1", boundaryType: "Block" },
                  { code: "B1", boundaryType: "Block" },
                ],
              },
              { code: "", boundaryType: "District" },
              { code: "D2" },
            ],
          },
        ],
      },
    });

    const result = await fetchBoundaryRelations(["D1"], "token-1");

    expect(result.districts).toEqual([{ code: "D1", parentCode: "" }]);
    expect(result.blocks).toEqual([{ code: "B1", parentCode: "D1" }]);
  });

  it("returns all-undefined boundary groups when the response has no boundary tree", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    const result = await fetchBoundaryRelations(["S1"], "token-1");

    expect(result).toEqual({
      states: undefined,
      districts: undefined,
      blocks: undefined,
      facilities: undefined,
    });
  });

  it("keeps the first parentCode for a boundary repeated under several parents, and the same code under two types as two boundaries", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        TenantBoundary: [
          {
            boundary: [
              {
                code: "S1",
                boundaryType: "State",
                children: [{ code: "D1", boundaryType: "District", children: [{ code: "B1", boundaryType: "Block" }] }],
              },
              {
                code: "S2",
                boundaryType: "State",
                children: [
                  // D1 again, under a different parent (includeParents repeats subtrees)
                  { code: "D1", boundaryType: "District", children: [{ code: "B2", boundaryType: "Block" }] },
                  { code: "X", boundaryType: "District" },
                  { code: "X", boundaryType: "Block" },
                ],
              },
            ],
          },
        ],
      },
    });

    const result = await fetchBoundaryRelations(["S1"], "token-1");

    expect(result.districts).toEqual([
      { code: "D1", parentCode: "S1" },
      { code: "X", parentCode: "S2" },
    ]);
    // B2 sits under the repeated D1, so its children are still collected.
    expect(result.blocks).toEqual([
      { code: "B1", parentCode: "D1" },
      { code: "B2", parentCode: "D1" },
      { code: "X", parentCode: "S2" },
    ]);
  });

  it("flattens a heavily repeated tree quickly (regression: quadratic dedupe froze the UI for ~2.5s)", async () => {
    // 40 states x 250 blocks, every state repeated 20 times -> 200k nodes, 10k distinct.
    const state = (s: number) => ({
      code: `S${s}`,
      boundaryType: "State",
      children: Array.from({ length: 250 }, (_, b) => ({ code: `S${s}B${b}`, boundaryType: "Block" })),
    });
    const boundary = Array.from({ length: 20 }, () => Array.from({ length: 40 }, (_, s) => state(s))).flat();
    vi.mocked(apiClient.post).mockResolvedValue({ data: { TenantBoundary: [{ boundary }] } });

    const started = performance.now();
    const result = await fetchBoundaryRelations([], "token-1");
    const elapsed = performance.now() - started;

    expect(result.states).toHaveLength(40);
    expect(result.blocks).toHaveLength(10_000);
    // The old implementation took seconds on this shape; the linear one takes tens of ms.
    expect(elapsed).toBeLessThan(1000);
  });
});
