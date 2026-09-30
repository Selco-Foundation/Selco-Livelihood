import { describe, expect, it } from "vitest";
import type { JurisdictionBoundaries } from "@/shared";
import { buildFacilitySearchCriteria, deriveDistrictBlockCodes } from "./jurisdiction-facility-criteria";

describe("buildFacilitySearchCriteria", () => {
  it("returns the base criteria when jurisdiction is null", () => {
    expect(buildFacilitySearchCriteria(null, "tenant-1")).toEqual({
      limit: 100,
      offset: 0,
      isOnmReady: false,
      tenantId: ["tenant-1"],
    });
  });

  it("returns the base criteria when jurisdiction is undefined", () => {
    expect(buildFacilitySearchCriteria(undefined, "tenant-1")).toEqual({
      limit: 100,
      offset: 0,
      isOnmReady: false,
      tenantId: ["tenant-1"],
    });
  });

  it("adds state, district, and block codes when present", () => {
    const jurisdiction: JurisdictionBoundaries = {
      state: ["STATE_1"],
      district: ["DIST_1"],
      block: ["BLOCK_1"],
    };
    const result = buildFacilitySearchCriteria(jurisdiction, "tenant-1");
    expect(result).toMatchObject({ state: ["STATE_1"], district: ["DIST_1"], block: ["BLOCK_1"] });
  });

  it("omits a hierarchy key whose codes array is empty", () => {
    const jurisdiction: JurisdictionBoundaries = { state: [], district: ["DIST_1"], block: [] };
    const result = buildFacilitySearchCriteria(jurisdiction, "tenant-1");
    expect(result.state).toBeUndefined();
    expect(result.block).toBeUndefined();
    expect(result.district).toEqual(["DIST_1"]);
  });

  it("sets boundaryCodes from jurisdiction.facility when the facility key is present", () => {
    const jurisdiction: JurisdictionBoundaries = { facility: ["FAC_1", "FAC_2"] };
    const result = buildFacilitySearchCriteria(jurisdiction, "tenant-1");
    expect(result.boundaryCodes).toEqual(["FAC_1", "FAC_2"]);
  });

  it("sets boundaryCodes to an empty array when jurisdiction.facility is present but empty", () => {
    const jurisdiction: JurisdictionBoundaries = { facility: [] };
    const result = buildFacilitySearchCriteria(jurisdiction, "tenant-1");
    expect(result.boundaryCodes).toEqual([]);
  });

  it("omits boundaryCodes entirely when jurisdiction has no facility key", () => {
    const jurisdiction: JurisdictionBoundaries = { district: ["DIST_1"] };
    const result = buildFacilitySearchCriteria(jurisdiction, "tenant-1");
    expect(result.boundaryCodes).toBeUndefined();
  });
});

describe("deriveDistrictBlockCodes", () => {
  it("resolves the block code that the boundaryCode starts with", () => {
    const jurisdiction: JurisdictionBoundaries = { district: ["DIST_1"], block: ["BLOCK_1", "BLOCK_2"] };
    const result = deriveDistrictBlockCodes("BLOCK_2_FACILITY_1", jurisdiction);
    expect(result.blockCode).toBe("BLOCK_2");
  });

  it("resolves the district code that the boundaryCode starts with", () => {
    const jurisdiction: JurisdictionBoundaries = { district: ["DIST_1", "DIST_2"], block: ["BLOCK_1"] };
    const result = deriveDistrictBlockCodes("DIST_2_BLOCK_1", jurisdiction);
    expect(result.districtCode).toBe("DIST_2");
  });

  it("falls back to the first block code when no block code matches the prefix", () => {
    const jurisdiction: JurisdictionBoundaries = { district: [], block: ["BLOCK_1", "BLOCK_2"] };
    const result = deriveDistrictBlockCodes("UNRELATED_CODE", jurisdiction);
    expect(result.blockCode).toBe("BLOCK_1");
  });

  it("falls back to the boundaryCode itself when block codes are empty", () => {
    const jurisdiction: JurisdictionBoundaries = { district: [], block: [] };
    const result = deriveDistrictBlockCodes("SOME_CODE", jurisdiction);
    expect(result.blockCode).toBe("SOME_CODE");
  });

  it("falls back to the first district code when no district code matches the prefix", () => {
    const jurisdiction: JurisdictionBoundaries = { district: ["DIST_1", "DIST_2"], block: [] };
    const result = deriveDistrictBlockCodes("UNRELATED_CODE", jurisdiction);
    expect(result.districtCode).toBe("DIST_1");
  });

  it("falls back to the resolved block code when district codes are empty", () => {
    const jurisdiction: JurisdictionBoundaries = { district: [], block: ["BLOCK_1"] };
    const result = deriveDistrictBlockCodes("BLOCK_1_FACILITY", jurisdiction);
    expect(result.districtCode).toBe("BLOCK_1");
  });

  it("handles a null/undefined jurisdiction by falling back to the boundaryCode itself", () => {
    const result = deriveDistrictBlockCodes("SOME_CODE", null);
    expect(result).toEqual({ districtCode: "SOME_CODE", blockCode: "SOME_CODE" });
  });
});
