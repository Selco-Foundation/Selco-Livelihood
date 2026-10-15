import { describe, expect, it } from "vitest";
import { isOtherReason, mapRejectionReasonOptions } from "./rejection-reason-mapping";

describe("isOtherReason", () => {
  it("matches when the code is 'other' case-insensitively", () => {
    expect(isOtherReason({ code: "OTHER", name: "Something else" })).toBe(true);
  });

  it("matches when the code is 'others'", () => {
    expect(isOtherReason({ code: "Others", name: "Something else" })).toBe(true);
  });

  it("matches when the name (not the code) is 'other'", () => {
    expect(isOtherReason({ code: "MISC", name: "Other" })).toBe(true);
  });

  it("trims whitespace before comparing", () => {
    expect(isOtherReason({ code: " other ", name: "Something else" })).toBe(true);
  });

  it("returns false for an unrelated reason", () => {
    expect(isOtherReason({ code: "DAMAGED_GOODS", name: "Damaged Goods" })).toBe(false);
  });
});

describe("mapRejectionReasonOptions", () => {
  it("drops raw entries missing a code or name", () => {
    const masters = {
      RejectionReasons: [{ code: "A", name: "Alpha" }, { code: "B" }, { name: "NoCode" }, {}],
    };
    expect(mapRejectionReasonOptions(masters)).toEqual([{ code: "A", name: "Alpha" }]);
  });

  it("sorts alphabetically by name", () => {
    const masters = {
      RejectionReasons: [
        { code: "B", name: "Beta" },
        { code: "A", name: "Alpha" },
      ],
    };
    expect(mapRejectionReasonOptions(masters)).toEqual([
      { code: "A", name: "Alpha" },
      { code: "B", name: "Beta" },
    ]);
  });

  it("always pushes the 'Other' entry to the end regardless of alphabetical order", () => {
    const masters = {
      RejectionReasons: [
        { code: "OTHER", name: "Other" },
        { code: "A", name: "Alpha" },
        { code: "Z", name: "Zeta" },
      ],
    };
    expect(mapRejectionReasonOptions(masters).map((option) => option.code)).toEqual([
      "A",
      "Z",
      "OTHER",
    ]);
  });

  it("returns an empty array when the master is missing", () => {
    expect(mapRejectionReasonOptions({})).toEqual([]);
  });
});
