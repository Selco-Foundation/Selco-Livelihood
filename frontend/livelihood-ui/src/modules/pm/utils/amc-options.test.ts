import { describe, expect, it } from "vitest";
import { toAmcFrequencyOptions, toAmcYearsOptions } from "./amc-options";

describe("toAmcFrequencyOptions", () => {
  it("lists active frequencies shortest first, with an English label", () => {
    const options = toAmcFrequencyOptions({
      Frequency: [
        { code: "ONE_YEAR", months: 12, labelKey: "AMC_FREQUENCY_ONE_YEAR", active: true },
        { code: "ONE_MONTH", months: 1, labelKey: "AMC_FREQUENCY_ONE_MONTH", active: true },
        { code: "OLD", months: 3, active: false },
        { code: "SIX_MONTHS", months: 6, labelKey: "AMC_FREQUENCY_SIX_MONTHS", active: true },
      ],
    });
    expect(options.map((option) => [option.months, option.fallback])).toEqual([
      [1, "1 month"],
      [6, "6 months"],
      [12, "1 year"],
    ]);
    expect(options[0].labelKey).toBe("AMC_FREQUENCY_ONE_MONTH");
  });

  it("returns nothing when the master is missing", () => {
    expect(toAmcFrequencyOptions({})).toEqual([]);
  });
});

describe("toAmcYearsOptions", () => {
  it("lists active durations shortest first", () => {
    const options = toAmcYearsOptions({
      Duration: [
        { code: "TWO_YEARS", years: 2, active: true },
        { code: "ONE_YEAR", years: 1, active: true },
      ],
    });
    expect(options.map((option) => option.fallback)).toEqual(["1 year", "2 years"]);
  });
});
