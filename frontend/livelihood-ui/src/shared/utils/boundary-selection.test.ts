import { describe, expect, it } from "vitest";
import type { BoundaryHierarchy } from "../api/boundary";
import { buildBoundaryDataTree, pruneBoundarySelection } from "./boundary-selection";

const hierarchy: BoundaryHierarchy = {
  states: [{ code: "HP", parentCode: "INDIA" }, { code: "CG", parentCode: "INDIA" }],
  districts: [
    { code: "HP_BILASPUR", parentCode: "HP" },
    { code: "CG_BILASPUR", parentCode: "CG" },
    { code: "CG_RAIPUR", parentCode: "CG" },
  ],
  blocks: [
    { code: "HP_BILASPUR_GHUMARWIN", parentCode: "HP_BILASPUR" },
    { code: "CG_BILASPUR_MASTURI", parentCode: "CG_BILASPUR" },
    { code: "CG_RAIPUR_ABHANPUR", parentCode: "CG_RAIPUR" },
  ],
};

describe("pruneBoundarySelection", () => {
  it("drops districts and blocks whose parent is no longer selected", () => {
    const pruned = pruneBoundarySelection(
      {
        states: ["CG"],
        districts: ["HP_BILASPUR", "CG_RAIPUR"],
        blocks: ["HP_BILASPUR_GHUMARWIN", "CG_RAIPUR_ABHANPUR", "CG_BILASPUR_MASTURI"],
      },
      hierarchy,
    );
    expect(pruned).toEqual({ states: ["CG"], districts: ["CG_RAIPUR"], blocks: ["CG_RAIPUR_ABHANPUR"] });
  });

  it("keeps everything when nothing is orphaned", () => {
    const selection = { states: ["HP"], districts: ["HP_BILASPUR"], blocks: ["HP_BILASPUR_GHUMARWIN"] };
    expect(pruneBoundarySelection(selection, hierarchy)).toEqual(selection);
  });
});

describe("buildBoundaryDataTree", () => {
  it("nests the selected blocks under their district, state and the country", () => {
    const tree = buildBoundaryDataTree(
      {
        states: ["HP", "CG"],
        districts: ["HP_BILASPUR", "CG_BILASPUR", "CG_RAIPUR"],
        blocks: ["HP_BILASPUR_GHUMARWIN", "CG_BILASPUR_MASTURI"],
      },
      hierarchy,
    );
    expect(tree).toEqual({
      boundaryCode: "INDIA",
      type: "country",
      name: "INDIA",
      children: [
        {
          boundaryCode: "HP",
          type: "state",
          name: "HP",
          children: [
            {
              boundaryCode: "HP_BILASPUR",
              type: "district",
              name: "HP_BILASPUR",
              children: [{ boundaryCode: "HP_BILASPUR_GHUMARWIN", type: "block", name: "HP_BILASPUR_GHUMARWIN" }],
            },
          ],
        },
        {
          boundaryCode: "CG",
          type: "state",
          name: "CG",
          children: [
            {
              boundaryCode: "CG_BILASPUR",
              type: "district",
              name: "CG_BILASPUR",
              children: [{ boundaryCode: "CG_BILASPUR_MASTURI", type: "block", name: "CG_BILASPUR_MASTURI" }],
            },
          ],
        },
      ],
    });
  });

  it("leaves out states and districts with no selected block", () => {
    const tree = buildBoundaryDataTree({ states: ["HP"], districts: ["HP_BILASPUR"], blocks: [] }, hierarchy);
    expect(tree.children).toEqual([]);
  });
});
