import { describe, expect, it } from "vitest";
import type { BoundaryNode, useTranslate } from "@/shared";
import { boundaryDisplayName, cascadeBlockOptions, resolveBoundaryCodes } from "./boundary";

function mockT(t: (key: string) => string): ReturnType<typeof useTranslate>["t"] {
  return t as unknown as ReturnType<typeof useTranslate>["t"];
}

const blocks: BoundaryNode[] = [
  { code: "BLOCK_1", parentCode: "DISTRICT_1" },
  { code: "BLOCK_2", parentCode: "DISTRICT_1" },
  { code: "BLOCK_3", parentCode: "DISTRICT_2" },
];

const facilities: BoundaryNode[] = [
  { code: "FACILITY_1", parentCode: "BLOCK_1" },
  { code: "FACILITY_2", parentCode: "BLOCK_2" },
  { code: "FACILITY_3", parentCode: "BLOCK_3" },
];

describe("resolveBoundaryCodes", () => {
  it("returns undefined when no district or block filter is selected", () => {
    expect(resolveBoundaryCodes({ district: [], block: [] }, blocks, facilities)).toBeUndefined();
  });

  it("uses selected block codes directly when blocks are selected", () => {
    expect(resolveBoundaryCodes({ district: [], block: ["BLOCK_1"] }, blocks, facilities)).toEqual([
      "FACILITY_1",
    ]);
  });

  it("prefers block selection over district selection when both are present", () => {
    expect(
      resolveBoundaryCodes({ district: ["DISTRICT_2"], block: ["BLOCK_1"] }, blocks, facilities),
    ).toEqual(["FACILITY_1"]);
  });

  it("expands a district selection to every block under it, then to facilities", () => {
    expect(resolveBoundaryCodes({ district: ["DISTRICT_1"], block: [] }, blocks, facilities)).toEqual([
      "FACILITY_1",
      "FACILITY_2",
    ]);
  });

  it("returns an empty array when the selected block has no facilities", () => {
    expect(resolveBoundaryCodes({ district: [], block: ["BLOCK_4"] }, blocks, facilities)).toEqual([]);
  });
});

describe("cascadeBlockOptions", () => {
  it("returns every block when no districts are selected", () => {
    expect(cascadeBlockOptions(blocks, [])).toEqual(blocks);
  });

  it("filters blocks down to the selected districts", () => {
    expect(cascadeBlockOptions(blocks, ["DISTRICT_2"])).toEqual([
      { code: "BLOCK_3", parentCode: "DISTRICT_2" },
    ]);
  });
});

describe("boundaryDisplayName", () => {
  it("falls back to the raw code when no translation is found", () => {
    const t = mockT((key) => key);
    expect(boundaryDisplayName("DISTRICT_1", t)).toBe("DISTRICT_1");
  });

  it("uses the translated name when a translation is found", () => {
    const t = mockT((key) => (key === "BOUNDARY_DISTRICT_1" ? "District One" : key));
    expect(boundaryDisplayName("DISTRICT_1", t)).toBe("District One");
  });
});
