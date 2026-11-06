import { describe, expect, it } from "vitest";
import {
  aggregateBoundaryCodes,
  aggregateBoundaryTypes,
  buildJurisdictionBoundaries,
} from "./boundary-util";

describe("aggregateBoundaryCodes", () => {
  it("returns an empty array when boundaries is null", () => {
    expect(aggregateBoundaryCodes(null)).toEqual([]);
  });

  it("returns an empty array when boundaries is undefined", () => {
    expect(aggregateBoundaryCodes(undefined)).toEqual([]);
  });

  it("flattens codes across every boundary type", () => {
    expect(
      aggregateBoundaryCodes({
        district: ["D1", "D2"],
        block: ["B1"],
      }),
    ).toEqual(["D1", "D2", "B1"]);
  });

  it("treats a missing codes array for a key as empty", () => {
    expect(
      aggregateBoundaryCodes({
        district: undefined as unknown as string[],
      }),
    ).toEqual([]);
  });
});

describe("aggregateBoundaryTypes", () => {
  it("returns an empty array when boundaries is null", () => {
    expect(aggregateBoundaryTypes(null)).toEqual([]);
  });

  it("returns an empty array when boundaries is undefined", () => {
    expect(aggregateBoundaryTypes(undefined)).toEqual([]);
  });

  it("returns the boundary type keys", () => {
    expect(aggregateBoundaryTypes({ district: ["D1"], block: ["B1"] })).toEqual([
      "district",
      "block",
    ]);
  });
});

describe("buildJurisdictionBoundaries", () => {
  it("returns an empty object when jurisdictions is undefined", () => {
    expect(buildJurisdictionBoundaries(undefined)).toEqual({});
  });

  it("returns an empty object when jurisdictions is an empty array", () => {
    expect(buildJurisdictionBoundaries([])).toEqual({});
  });

  it("groups boundaries by lowercased boundary type", () => {
    expect(
      buildJurisdictionBoundaries([
        { boundaryType: "District", boundary: "D1" },
        { boundaryType: "District", boundary: "D2" },
        { boundaryType: "Block", boundary: "B1" },
      ]),
    ).toEqual({
      district: ["D1", "D2"],
      block: ["B1"],
    });
  });

  it("skips a jurisdiction missing boundaryType or boundary", () => {
    expect(
      buildJurisdictionBoundaries([
        { boundaryType: "District" },
        { boundary: "D1" },
        { boundaryType: "District", boundary: "D2" },
      ]),
    ).toEqual({ district: ["D2"] });
  });
});
