import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { fetchBoundaryRelations } from "./boundary";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchBoundaryRelations", () => {
  it("returns empty groups when the response has no boundary tree", () => {
    vi.spyOn(apiClient, "post").mockReturnValue(mockAxiosSuccess({ TenantBoundary: [] }));

    return fetchBoundaryRelations(["S1"], "token").then((result) => {
      expect(result).toEqual({
        states: undefined,
        districts: undefined,
        blocks: undefined,
        facilities: undefined,
      });
    });
  });

  it("groups a flat single-level tree by boundaryType", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        TenantBoundary: [
          {
            boundary: [{ code: "S1", boundaryType: "State" }],
          },
        ],
      }),
    );

    const result = await fetchBoundaryRelations(["S1"], "token");
    expect(result.states).toEqual([{ code: "S1", parentCode: "" }]);
  });

  it("flattens deeply nested children and tracks parentCode per level", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
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
      }),
    );

    const result = await fetchBoundaryRelations(["S1"], "token");
    expect(result.states).toEqual([{ code: "S1", parentCode: "" }]);
    expect(result.districts).toEqual([{ code: "D1", parentCode: "S1" }]);
    expect(result.blocks).toEqual([{ code: "B1", parentCode: "D1" }]);
  });

  it("skips a node missing a code entirely, including its children (continue precedes recursion)", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        TenantBoundary: [
          {
            boundary: [
              {
                boundaryType: "State",
                children: [{ code: "D1", boundaryType: "District" }],
              },
            ],
          },
        ],
      }),
    );

    const result = await fetchBoundaryRelations(["S1"], "token");
    expect(result.states).toBeUndefined();
    expect(result.districts).toBeUndefined();
  });

  it("still walks children of a valid sibling even when another sibling is skipped", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        TenantBoundary: [
          {
            boundary: [
              { boundaryType: "State" },
              {
                code: "S1",
                boundaryType: "State",
                children: [{ code: "D1", boundaryType: "District" }],
              },
            ],
          },
        ],
      }),
    );

    const result = await fetchBoundaryRelations(["S1"], "token");
    expect(result.states).toEqual([{ code: "S1", parentCode: "" }]);
    expect(result.districts).toEqual([{ code: "D1", parentCode: "S1" }]);
  });

  it("dedupes boundaries with the same code within the same type", async () => {
    vi.spyOn(apiClient, "post").mockReturnValue(
      mockAxiosSuccess({
        TenantBoundary: [
          {
            boundary: [
              {
                code: "S1",
                boundaryType: "State",
                children: [{ code: "D1", boundaryType: "District" }],
              },
              {
                code: "S1",
                boundaryType: "State",
                children: [{ code: "D2", boundaryType: "District" }],
              },
            ],
          },
        ],
      }),
    );

    const result = await fetchBoundaryRelations(["S1"], "token");
    expect(result.states).toEqual([{ code: "S1", parentCode: "" }]);
    expect(result.districts).toEqual([
      { code: "D1", parentCode: "S1" },
      { code: "D2", parentCode: "S1" },
    ]);
  });
});
