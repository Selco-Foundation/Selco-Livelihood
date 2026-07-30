import { describe, expect, it } from "vitest";
import { formatEpochToDate } from "./date-format";

describe("formatEpochToDate", () => {
  it("returns '-' when epoch is undefined", () => {
    expect(formatEpochToDate(undefined)).toBe("-");
  });

  it("returns '-' when epoch is 0 (falsy)", () => {
    expect(formatEpochToDate(0)).toBe("-");
  });

  it("formats a real epoch as a localized short date", () => {
    // 2024-01-15T00:00:00Z
    const formatted = formatEpochToDate(1705276800000);
    expect(formatted).toMatch(/2024/);
    expect(formatted).toMatch(/Jan/);
  });
});
