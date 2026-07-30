import { describe, expect, it } from "vitest";
import { buildFacilitySearchCriteria, deriveDistrictBlockCodes } from "./jurisdiction-facility-criteria";

describe("buildFacilitySearchCriteria", () => {
  it("returns base criteria with no hierarchy fields when jurisdiction is null", () => {
    expect(buildFacilitySearchCriteria(null, "livelihood")).toEqual({
      limit: 100,
      offset: 0,
      isOnmReady: false,
      tenantId: ["livelihood"],
    });
  });

  it("returns base criteria when jurisdiction is undefined", () => {
    expect(buildFacilitySearchCriteria(undefined, "livelihood")).toEqual({
      limit: 100,
      offset: 0,
      isOnmReady: false,
      tenantId: ["livelihood"],
    });
  });

  it("includes state/district/block codes only when non-empty", () => {
    const result = buildFacilitySearchCriteria(
      { state: ["S1"], district: [], block: ["B1"] },
      "livelihood",
    );
    expect(result.state).toEqual(["S1"]);
    expect(result.district).toBeUndefined();
    expect(result.block).toEqual(["B1"]);
  });

  it("sets boundaryCodes from facility when the facility key is present, even if empty", () => {
    const result = buildFacilitySearchCriteria({ facility: [] }, "livelihood");
    expect(result.boundaryCodes).toEqual([]);
  });

  it("omits boundaryCodes entirely when the facility key is absent", () => {
    const result = buildFacilitySearchCriteria({ state: ["S1"] }, "livelihood");
    expect(Object.hasOwn(result, "boundaryCodes")).toBe(false);
  });

  it("uses facility values when the key is present with codes", () => {
    const result = buildFacilitySearchCriteria({ facility: ["F1", "F2"] }, "livelihood");
    expect(result.boundaryCodes).toEqual(["F1", "F2"]);
  });
});

describe("deriveDistrictBlockCodes", () => {
  it("finds the block code that prefixes the boundary code", () => {
    const result = deriveDistrictBlockCodes("BLOCK1_SUBAREA", {
      district: ["DIST1"],
      block: ["BLOCK1"],
    });
    expect(result.blockCode).toBe("BLOCK1");
  });

  it("falls back to the first block when none prefixes the boundary code", () => {
    const result = deriveDistrictBlockCodes("UNRELATED_CODE", {
      district: [],
      block: ["BLOCK1", "BLOCK2"],
    });
    expect(result.blockCode).toBe("BLOCK1");
  });

  it("falls back the block code to the boundary code itself when block list is empty", () => {
    const result = deriveDistrictBlockCodes("SOME_CODE", { district: [], block: [] });
    expect(result.blockCode).toBe("SOME_CODE");
  });

  it("finds the district code that prefixes the boundary code", () => {
    const result = deriveDistrictBlockCodes("DIST1_SUBAREA", {
      district: ["DIST1"],
      block: [],
    });
    expect(result.districtCode).toBe("DIST1");
  });

  it("falls back district code to the first district when none prefixes", () => {
    const result = deriveDistrictBlockCodes("UNRELATED", {
      district: ["DIST1", "DIST2"],
      block: [],
    });
    expect(result.districtCode).toBe("DIST1");
  });

  it("falls back district code to the resolved block code when district list is empty", () => {
    const result = deriveDistrictBlockCodes("BLOCK1_AREA", { district: [], block: ["BLOCK1"] });
    expect(result.districtCode).toBe("BLOCK1");
  });

  it("handles a null/undefined jurisdiction by falling back everything to the boundary code", () => {
    const result = deriveDistrictBlockCodes("SOME_CODE", null);
    expect(result).toEqual({ districtCode: "SOME_CODE", blockCode: "SOME_CODE" });
  });
});
