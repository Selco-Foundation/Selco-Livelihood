import { describe, expect, it } from "vitest";
import { amcFieldStaffChangeText, hasAmcFieldStaffChanged } from "./amc-field-staff-change";

const t = (key: string) => key;

describe("amcFieldStaffChangeText", () => {
  it("adds up what happened to the visits of every row", () => {
    expect(
      amcFieldStaffChangeText(
        [
          { activityFacilityId: "a", outcome: "CHANGED", visitsMoved: 2, visitsReset: 1 },
          { activityFacilityId: "b", outcome: "CHANGED", visitsMoved: 1, visitsReset: 0 },
        ],
        t,
      ),
    ).toBe("Visits moved to the new field staff: 3. Visits restarted, saved report discarded: 1");
  });

  it("is undefined when no visit was touched", () => {
    expect(amcFieldStaffChangeText([{ activityFacilityId: "a", outcome: "CHANGED", visitsMoved: 0 }], t)).toBeUndefined();
    expect(amcFieldStaffChangeText(undefined, t)).toBeUndefined();
  });
});

describe("hasAmcFieldStaffChanged", () => {
  it("is false when every row is unchanged", () => {
    expect(hasAmcFieldStaffChanged([{ activityFacilityId: "a", outcome: "UNCHANGED" }])).toBe(false);
    expect(hasAmcFieldStaffChanged([{ activityFacilityId: "a", outcome: "CHANGED" }])).toBe(true);
  });
});
