/**
 * Unit tests for `formatEpochToDate` (src/modules/im/utils/date-format.ts).
 *
 * This is a pure, dependency-free formatting helper — it takes an optional
 * epoch millisecond timestamp and returns either a placeholder or a
 * locale-formatted date string. No React rendering, providers, or mocking
 * are needed: the function only touches `Date`/`Intl` under the hood, so
 * these tests call it directly and assert on the returned string.
 */
import { describe, expect, it } from "vitest";
import { formatEpochToDate } from "./date-format";

// formatEpochToDate(epoch?: number): string
// - Treats a falsy epoch (undefined, 0, NaN, etc.) as "no date available"
//   and returns the placeholder "-" instead of attempting to format it.
// - For any truthy epoch, builds a `Date` from the millisecond value and
//   formats it using the "en-IN" locale as "DD Mon YYYY" (2-digit day,
//   short month name, numeric year), e.g. "15 Jan 2024".
describe("formatEpochToDate", () => {
  it("returns '-' when epoch is undefined", () => {
    expect(formatEpochToDate(undefined)).toBe("-");
  });

  // epoch 0 is a valid timestamp (1970-01-01) but is falsy in JS, and the
  // implementation's `if (!epoch)` check deliberately treats it the same as
  // "missing" rather than formatting the Unix epoch date.
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
