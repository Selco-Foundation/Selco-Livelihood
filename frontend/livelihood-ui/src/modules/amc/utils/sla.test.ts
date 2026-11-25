import { describe, expect, it } from "vitest";
import { amcSlaTone } from "./sla";

describe("amcSlaTone", () => {
  it("is green with 4 or more days left, yellow at 3 or fewer, red once breached", () => {
    expect(amcSlaTone({ daysRemaining: 4, breached: false })).toBe("ok");
    expect(amcSlaTone({ daysRemaining: 3, breached: false })).toBe("warning");
    expect(amcSlaTone({ daysRemaining: 0, breached: false })).toBe("warning");
    expect(amcSlaTone({ daysRemaining: -1, breached: true })).toBe("breached");
  });
});
