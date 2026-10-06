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
});
