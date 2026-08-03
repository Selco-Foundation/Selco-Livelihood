/**
 * Unit tests for `jurisdiction-facility-criteria.ts`.
 *
 * Covers two pure, side-effect-free helper functions used to turn a user's
 * jurisdiction selection (state/district/block/facility boundary codes) into
 * request criteria and derived codes for facility asset search. Since both
 * functions are pure (no I/O, no React, no network), no mocking or test
 * wrappers/providers are needed here — tests simply call the functions with
 * varied inputs and assert on the returned plain objects.
 */
import { describe, expect, it } from "vitest";
import { buildFacilitySearchCriteria, deriveDistrictBlockCodes } from "./jurisdiction-facility-criteria";

// buildFacilitySearchCriteria(jurisdiction, tenantId) builds the search payload
// for facility bulk search: it always sets fixed defaults (limit, offset,
// isOnmReady, tenantId), then, when a jurisdiction is provided, copies over
// state/district/block codes only if they are non-empty arrays, and separately
// sets `boundaryCodes` from `jurisdiction.facility` whenever the `facility` key
// is present at all on the object (even if its value is an empty array) —
// distinct from the hierarchy keys, which are omitted when empty.
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

  // Empty arrays (like `district: []` here) must be treated as "not selected"
  // and left off the criteria object entirely, while a non-empty array for
  // the same hierarchy key is copied through as-is.
  it("includes state/district/block codes only when non-empty", () => {
    const result = buildFacilitySearchCriteria(
      { state: ["S1"], district: [], block: ["B1"] },
      "livelihood",
    );
    expect(result.state).toEqual(["S1"]);
    expect(result.district).toBeUndefined();
    expect(result.block).toEqual(["B1"]);
  });

  // Unlike state/district/block, `facility` uses presence-of-key semantics
  // (via `Object.hasOwn`), not "is non-empty" — so an explicit empty array
  // still results in `boundaryCodes: []` being set on the criteria.
  it("sets boundaryCodes from facility when the facility key is present, even if empty", () => {
    const result = buildFacilitySearchCriteria({ facility: [] }, "livelihood");
    expect(result.boundaryCodes).toEqual([]);
  });

  // When the jurisdiction object has no `facility` key at all, `boundaryCodes`
  // must be left off the result rather than set to `undefined`/`[]`.
  it("omits boundaryCodes entirely when the facility key is absent", () => {
    const result = buildFacilitySearchCriteria({ state: ["S1"] }, "livelihood");
    expect(Object.hasOwn(result, "boundaryCodes")).toBe(false);
  });

  it("uses facility values when the key is present with codes", () => {
    const result = buildFacilitySearchCriteria({ facility: ["F1", "F2"] }, "livelihood");
    expect(result.boundaryCodes).toEqual(["F1", "F2"]);
  });
});

// deriveDistrictBlockCodes(boundaryCode, jurisdiction) resolves the specific
// block/district codes that "own" a given boundary code (e.g. a facility's
// boundary code) from the jurisdiction's list of allowed block/district
// codes. Resolution order for each is: (1) the first candidate code that is a
// string-prefix of the boundary code, else (2) the first entry in that list,
// else (3) a further fallback (the boundary code itself for block; the
// resolved block code for district) — so district falls back through block,
// which in turn falls back to the raw boundary code.
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
