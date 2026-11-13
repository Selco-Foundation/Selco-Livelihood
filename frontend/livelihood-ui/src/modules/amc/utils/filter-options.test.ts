import { describe, expect, it } from "vitest";
import type { AmcReport } from "../types/amc-report";
import { buildAmcFilterOptions, pruneAmcGeography } from "./filter-options";

function report(state: string, district: string, block: string, vendorName: string): AmcReport {
  return { state, district, block, vendorName } as AmcReport;
}

const reports = [
  report("Assam", "Kamrup", "Rangia", "Vendor B"),
  report("Assam", "Barpeta", "Sorbhog", "Vendor A"),
  report("Karnataka", "Mandya", "Maddur", "Vendor A"),
];

describe("buildAmcFilterOptions", () => {
  it("lists every distinct vendor and state, sorted", () => {
    const options = buildAmcFilterOptions(reports, { states: [], districts: [] });

    expect(options.vendors.map((option) => option.code)).toEqual(["Vendor A", "Vendor B"]);
    expect(options.states.map((option) => option.code)).toEqual(["Assam", "Karnataka"]);
  });

  it("narrows districts to the selected states and blocks to the selected districts", () => {
    const options = buildAmcFilterOptions(reports, { states: ["Assam"], districts: ["Kamrup"] });

    expect(options.districts.map((option) => option.code)).toEqual(["Barpeta", "Kamrup"]);
    expect(options.blocks.map((option) => option.code)).toEqual(["Rangia"]);
  });
});

describe("pruneAmcGeography", () => {
  it("drops selected districts and blocks that are no longer offered", () => {
    const options = buildAmcFilterOptions(reports, { states: ["Karnataka"], districts: [] });

    expect(pruneAmcGeography({ districts: ["Kamrup", "Mandya"], blocks: ["Rangia", "Maddur"] }, options)).toEqual({
      districts: ["Mandya"],
      blocks: ["Maddur"],
    });
  });
});
