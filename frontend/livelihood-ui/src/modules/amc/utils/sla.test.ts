import { describe, expect, it } from "vitest";
import { amcSlaState } from "./sla";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 10, 20, 15, 0).getTime();

function submittedDaysAgo(days: number) {
  return now - days * DAY;
}

describe("amcSlaState", () => {
  it.each([
    [0, 7, "ok"],
    [3, 4, "ok"],
    [4, 3, "warning"],
    [6, 1, "warning"],
    [7, 0, "breached"],
    [8, -1, "breached"],
  ])("submitted %i days ago leaves %i days, tone %s", (daysAgo, remainingDays, tone) => {
    expect(amcSlaState(submittedDaysAgo(daysAgo), now)).toEqual({
      remainingDays,
      tone,
      breached: tone === "breached",
    });
  });

  it("counts calendar days, not 24-hour periods", () => {
    const lateYesterday = new Date(2026, 10, 19, 23, 30).getTime();
    const earlyToday = new Date(2026, 10, 20, 0, 30).getTime();

    expect(amcSlaState(lateYesterday, earlyToday).remainingDays).toBe(6);
  });
});
