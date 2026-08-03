/**
 * Unit tests for jurisdiction boundary utilities.
 *
 * Covers: aggregateBoundaryCodes(), aggregateBoundaryTypes(), buildJurisdictionBoundaries()
 * Testing approach: Direct unit tests of pure transformation functions; no mocks or providers needed.
 */
import { describe, expect, it } from "vitest";
import {
  aggregateBoundaryCodes,
  aggregateBoundaryTypes,
  buildJurisdictionBoundaries,
} from "./boundary-util";

/**
 * aggregateBoundaryCodes: Flattens all boundary codes from a JurisdictionBoundaries object.
 * Inputs: boundaries (Record<string, string[]> | null | undefined). Returns a flat array of codes.
 */
describe("aggregateBoundaryCodes", () => {
  it("returns an empty array for null input", () => {
    expect(aggregateBoundaryCodes(null)).toEqual([]);
  });

  it("returns an empty array for undefined input", () => {
    expect(aggregateBoundaryCodes(undefined)).toEqual([]);
  });

  it("flattens codes from every boundary type", () => {
    expect(
      aggregateBoundaryCodes({ state: ["S1"], district: ["D1", "D2"], block: [] }),
    ).toEqual(["S1", "D1", "D2"]);
  });
});

/**
 * aggregateBoundaryTypes: Extracts the boundary type keys from a JurisdictionBoundaries object.
 * Inputs: boundaries (Record<string, string[]> | null | undefined). Returns an array of type keys.
 */
describe("aggregateBoundaryTypes", () => {
  it("returns an empty array for null input", () => {
    expect(aggregateBoundaryTypes(null)).toEqual([]);
  });

  it("returns the boundary type keys", () => {
    expect(aggregateBoundaryTypes({ state: ["S1"], district: ["D1"] })).toEqual([
      "state",
      "district",
    ]);
  });
});

/**
 * buildJurisdictionBoundaries: Groups jurisdiction entries by their boundary type (case-insensitive).
 * Inputs: jurisdictions (Array<{ boundaryType?, boundary? }> | undefined). Returns Record<string, string[]>.
 * Skips entries missing boundaryType or boundary; lower-cases the type as the grouping key;
 * accumulates multiple boundaries under the same type into an array.
 */
describe("buildJurisdictionBoundaries", () => {
  it("returns an empty object for undefined input", () => {
    expect(buildJurisdictionBoundaries(undefined)).toEqual({});
  });

  it("skips entries missing boundaryType or boundary", () => {
    expect(
      buildJurisdictionBoundaries([
        { boundaryType: "State" },
        { boundary: "B1" },
        { boundaryType: "", boundary: "B2" },
      ]),
    ).toEqual({});
  });

  it("lower-cases the boundaryType as the grouping key", () => {
    expect(buildJurisdictionBoundaries([{ boundaryType: "STATE", boundary: "S1" }])).toEqual({
      state: ["S1"],
    });
  });

  it("accumulates multiple boundaries under the same type", () => {
    expect(
      buildJurisdictionBoundaries([
        { boundaryType: "district", boundary: "D1" },
        { boundaryType: "district", boundary: "D2" },
      ]),
    ).toEqual({ district: ["D1", "D2"] });
  });

  it("groups mixed types independently and case-insensitively", () => {
    expect(
      buildJurisdictionBoundaries([
        { boundaryType: "State", boundary: "S1" },
        { boundaryType: "state", boundary: "S2" },
        { boundaryType: "Block", boundary: "B1" },
      ]),
    ).toEqual({ state: ["S1", "S2"], block: ["B1"] });
  });
});
