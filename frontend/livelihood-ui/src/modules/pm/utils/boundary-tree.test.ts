import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FacilitySummary } from "@/shared/api/facility";
import type { GeographyDetails } from "../types/project";
import { buildProjectBoundaryTree, buildScopeBoundaryTree } from "./boundary-tree";

const geography: GeographyDetails = {
  states: [{ code: "KA" }],
  districts: [{ code: "D1", stateCode: "KA" }],
  blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }],
};

describe("buildProjectBoundaryTree", () => {
  beforeEach(() => {
    window.globalConfigs = { getConfig: () => undefined };
  });

  afterEach(() => {
    window.globalConfigs = { getConfig: () => undefined };
  });

  it("builds a country -> state -> district -> block tree using codes as names", () => {
    const tree = buildProjectBoundaryTree(geography, "tenant-1");

    expect(tree).toEqual({
      boundaryCode: "INDIA",
      type: "country",
      name: "India",
      tenantId: "tenant-1",
      children: [
        {
          boundaryCode: "KA",
          type: "state",
          name: "KA",
          children: [
            {
              boundaryCode: "D1",
              type: "district",
              name: "D1",
              children: [{ boundaryCode: "B1", type: "block", name: "B1" }],
            },
          ],
        },
      ],
    });
  });

  it("defaults the country tenantId to the shared tenantId() when not given", () => {
    window.globalConfigs = { getConfig: (key: string) => (key === "STATE_LEVEL_TENANT_ID" ? "livelihood" : undefined) };

    const tree = buildProjectBoundaryTree(geography);

    expect(tree.tenantId).toBe("livelihood");
  });

  it("returns an empty children array for a state with no districts", () => {
    const tree = buildProjectBoundaryTree({ states: [{ code: "AS" }] }, "tenant-1");

    expect(tree.children).toEqual([{ boundaryCode: "AS", type: "state", name: "AS", children: [] }]);
  });

  it("uses the legacy singular state field when states[] is absent", () => {
    const tree = buildProjectBoundaryTree({ state: { code: "ML" } }, "tenant-1");

    expect(tree.children).toEqual([{ boundaryCode: "ML", type: "state", name: "ML", children: [] }]);
  });
});

describe("buildScopeBoundaryTree", () => {
  function facility(overrides: Partial<FacilitySummary> = {}): FacilitySummary {
    return { boundaryCode: "B1_fac-1", facilityId: "fac-1", ...overrides };
  }

  it("leaves facility-level codes ({blockCode}_{facilityId}) at the block level", () => {
    const tree = buildScopeBoundaryTree(geography, [facility({ facilityName: "Site One" })], "tenant-1");

    expect(tree.children).toEqual([
      {
        boundaryCode: "KA",
        type: "state",
        name: "KA",
        children: [
          {
            boundaryCode: "D1",
            type: "district",
            name: "D1",
            children: [{ boundaryCode: "B1_fac-1", type: "block", name: "Site One" }],
          },
        ],
      },
    ]);
  });

  it("falls back to facilityId as the display name when facilityName is absent", () => {
    const tree = buildScopeBoundaryTree(geography, [facility()], "tenant-1");

    expect(tree.children![0].children![0].children).toEqual([
      { boundaryCode: "B1_fac-1", type: "block", name: "fac-1" },
    ]);
  });

  it("groups multiple facilities under the same block", () => {
    const facilities = [
      facility({ facilityId: "fac-1", boundaryCode: "B1_fac-1" }),
      facility({ facilityId: "fac-2", boundaryCode: "B1_fac-2" }),
    ];

    const tree = buildScopeBoundaryTree(geography, facilities, "tenant-1");

    expect(tree.children![0].children![0].children).toHaveLength(2);
  });

  it("excludes a district's children when none of its facilities are provided", () => {
    const tree = buildScopeBoundaryTree(geography, [], "tenant-1");

    expect(tree.children![0].children![0].children).toEqual([]);
  });

  it("treats a boundaryCode without the facilityId suffix as already being the block code", () => {
    const facilities = [facility({ facilityId: "fac-1", boundaryCode: "B1" })];

    const tree = buildScopeBoundaryTree(geography, facilities, "tenant-1");

    expect(tree.children![0].children![0].children).toEqual([
      { boundaryCode: "B1_fac-1", type: "block", name: "fac-1" },
    ]);
  });
});
