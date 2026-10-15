import { describe, expect, it } from "vitest";
import { formatEpochToDate } from "./date-format";

describe("formatEpochToDate", () => {
  it("formats an epoch ms timestamp as a 2-digit day, short month, and numeric year", () => {
    const epoch = new Date(2026, 0, 5).getTime();
    expect(formatEpochToDate(epoch)).toBe("05 Jan 2026");
  });

  it("returns a dash when epoch is undefined", () => {
    expect(formatEpochToDate(undefined)).toBe("-");
  });

  it("returns a dash when epoch is 0", () => {
    expect(formatEpochToDate(0)).toBe("-");
  });
});
