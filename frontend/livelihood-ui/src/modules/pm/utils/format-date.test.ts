import { describe, expect, it } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  it("renders an epoch-millis timestamp as dd MMM yyyy", () => {
    // 2026-01-15T00:00:00Z
    expect(formatDate(1768435200000)).toBe("15 Jan 2026");
  });

  it("returns '-' when value is undefined", () => {
    expect(formatDate(undefined)).toBe("-");
  });

  it("returns '-' when value is 0", () => {
    expect(formatDate(0)).toBe("-");
  });
});
