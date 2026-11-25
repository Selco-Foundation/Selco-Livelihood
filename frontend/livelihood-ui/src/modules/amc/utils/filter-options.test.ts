import { describe, expect, it } from "vitest";
import { buildGeographyOptions, pruneAmcGeography, toVendorOptions } from "./filter-options";

const hierarchy = {
  states: [{ code: "KA", parentCode: "IN" }, { code: "AS", parentCode: "IN" }],
  districts: [{ code: "KA_HV", parentCode: "KA" }, { code: "AS_BK", parentCode: "AS" }],
  blocks: [{ code: "KA_HV_1", parentCode: "KA_HV" }, { code: "AS_BK_1", parentCode: "AS_BK" }],
};
const nameOf = (code: string) => `name-${code}`;

describe("buildGeographyOptions", () => {
  it("lists every level when nothing is selected", () => {
    const options = buildGeographyOptions(hierarchy, { states: [], districts: [] }, nameOf);
    expect(options.states.map((option) => option.code)).toEqual(["AS", "KA"]);
    expect(options.blocks).toHaveLength(2);
  });

  it("narrows districts to the chosen states and blocks to the chosen districts", () => {
    const options = buildGeographyOptions(hierarchy, { states: ["KA"], districts: [] }, nameOf);
    expect(options.districts).toEqual([{ code: "KA_HV", name: "name-KA_HV" }]);
    expect(options.blocks.map((option) => option.code)).toEqual(["KA_HV_1"]);
  });

  it("drops selections that no longer fit", () => {
    const options = buildGeographyOptions(hierarchy, { states: ["KA"], districts: [] }, nameOf);
    expect(pruneAmcGeography({ districts: ["AS_BK"], blocks: ["KA_HV_1"] }, options)).toEqual({
      districts: [],
      blocks: ["KA_HV_1"],
    });
  });
});

describe("toVendorOptions", () => {
  it("keeps active organisations, by id and sorted by name", () => {
    expect(
      toVendorOptions({
        organisations: [
          { id: "2", name: "Zed", orgStatus: "ACTIVE" },
          { id: "1", name: "Alpha", orgStatus: "ACTIVE" },
          { id: "3", name: "Gone", orgStatus: "INACTIVE" },
        ],
      }),
    ).toEqual([
      { code: "1", name: "Alpha" },
      { code: "2", name: "Zed" },
    ]);
  });
});
