/**
 * Unit tests for `fetchBoundaryRelations` (src/shared/api/boundary.ts).
 *
 * `fetchBoundaryRelations` calls the boundary-service `_search` endpoint and then
 * recursively flattens the nested `TenantBoundary[0].boundary` tree (via the internal,
 * non-exported `extractBoundaries` helper) into flat arrays keyed by boundary type
 * (State/District/Block/Facility), recording each node's `code` and its immediate
 * `parentCode`. Because `extractBoundaries` is not exported, its recursion/pruning/
 * dedupe rules are verified indirectly through the shape of `fetchBoundaryRelations`'s
 * return value.
 *
 * Mocking strategy: `apiClient.post` is spied on with `vi.spyOn` and stubbed via
 * `mockAxiosSuccess` (a small helper that wraps a payload in a resolved axios-shaped
 * response) so no real HTTP call is made and each test can supply its own
 * `TenantBoundary` boundary tree fixture. No component/router/provider wrappers are
 * needed since this is a plain async data-fetching function, not a React component.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockAxiosSuccess } from "@/test/mocks/api-responses";
import { apiClient } from "./client";
import { fetchBoundaryRelations } from "./boundary";

afterEach(() => {
  vi.restoreAllMocks();
});

// fetchBoundaryRelations(codes, accessToken, user?) posts a boundary-relationships
// search request and reshapes the response's nested boundary tree into
// { states, districts, blocks, facilities }, each an array of { code, parentCode }.
// It expects apiClient.post to resolve with an axios-shaped response whose
// `data.TenantBoundary[0].boundary` is the (possibly absent) tree to flatten.
describe("fetchBoundaryRelations", () => {
  // When `TenantBoundary` is an empty array, `boundary` is undefined so the
  // recursive extractor short-circuits on its `!boundaries?.length` guard and
  // returns an empty compiled object -- every group key on the result is undefined
  // rather than an empty array.
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

  // A top-level node has no ancestor, so its parentCode defaults to the empty
  // string ("") passed as the initial `parentCode` argument to extractBoundaries.
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

  // Each recursive call passes the current node's own code down as the parentCode
  // for its children, so a 3-level State -> District -> Block chain should produce
  // three separate groups, each entry's parentCode pointing at its direct parent
  // (not the root), confirming parentCode isn't inherited from higher ancestors.
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

  // The `continue` for a missing code only skips that one iteration of the sibling
  // loop -- it does not return early from the whole function, so a later valid
  // sibling (and its children) must still be visited and compiled.
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

  // Two sibling "State" nodes share the same code (S1); the `existingBoundaries.some`
  // check prevents a duplicate S1 entry in `states`, but each sibling's own children
  // are still walked independently, so both D1 and D2 (both parented to S1) end up
  // in `districts`.
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
