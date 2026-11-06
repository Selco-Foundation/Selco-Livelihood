import { describe, expect, it } from "vitest";
import { formatDate } from "./format-date";

describe("formatDate", () => {
  it("renders an epoch-millis timestamp as dd MMM yyyy", () => {
    // Local noon on 2026-01-15
    expect(formatDate(new Date(2026, 0, 15, 12).getTime())).toBe("15 Jan 2026");
  });

  it("returns '-' when value is undefined", () => {
    expect(formatDate(undefined)).toBe("-");
  });

  it("returns '-' when value is 0", () => {
    expect(formatDate(0)).toBe("-");
  });
});
