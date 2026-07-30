import { describe, expect, it } from "vitest";
import {
  aggregateBoundaryCodes,
  aggregateBoundaryTypes,
  buildJurisdictionBoundaries,
} from "./boundary-util";

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
