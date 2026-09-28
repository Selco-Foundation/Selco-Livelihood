import { describe, expect, it } from "vitest";
import { formatEpochDate } from "./date-format";

describe("formatEpochDate", () => {
  it("formats an epoch ms timestamp as MM/DD/YYYY", () => {
    const epoch = new Date(2026, 8, 5).getTime();
    expect(formatEpochDate(epoch)).toBe("09/05/2026");
  });

  it("pads single-digit month and day", () => {
    const epoch = new Date(2026, 0, 1).getTime();
    expect(formatEpochDate(epoch)).toBe("01/01/2026");
  });

  it("does not pad a four-digit year", () => {
    const epoch = new Date(2026, 11, 31).getTime();
    expect(formatEpochDate(epoch)).toBe("12/31/2026");
  });
});
