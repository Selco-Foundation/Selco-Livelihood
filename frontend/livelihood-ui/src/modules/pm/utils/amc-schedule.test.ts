import { describe, expect, it } from "vitest";
import type { AmcScheduleRow, RawAmcSchedule } from "../types/amc";
import {
  firstAmcDueDate,
  isAmcScheduleDirty,
  isPendingActivation,
  toAmcScheduleRows,
  toRawAmcSchedules,
  totalAmcActivities,
  validateAmcSchedules,
} from "./amc-schedule";

const raw: RawAmcSchedule = {
  id: "amc-1",
  fieldPlanId: "plan-1",
  facilityId: "site-1",
  endUser: { name: "user979", mobileNumber: "9876543210" },
  boundary: { state: "Assam", district: "Kamrup", block: "Rangia" },
  componentType: "SOLAR",
  installationReportFirstSubmissionDate: 900,
  configurationStartDate: 1000,
  visitFrequencyMonths: 6,
  durationMonths: 24,
};

const row: AmcScheduleRow = {
  id: "amc-1",
  facilityId: "site-1",
  endUserName: "user979",
  phoneNumber: "9876543210",
  state: "Assam",
  district: "Kamrup",
  block: "Rangia",
  installedOn: 900,
  startDate: 1000,
  frequencyMonths: 6,
  years: 2,
};

describe("toAmcScheduleRows", () => {
  it("maps a raw schedule into a row, converting duration months to years", () => {
    expect(toAmcScheduleRows({ AmcSchedules: [raw] })).toEqual([row]);
  });

  it("returns no rows for a missing response", () => {
    expect(toAmcScheduleRows(undefined)).toEqual([]);
  });

  it("leaves blank values undefined", () => {
    const [mapped] = toAmcScheduleRows({
      AmcSchedules: [
        {
          ...raw,
          installationReportFirstSubmissionDate: null,
          configurationStartDate: null,
          visitFrequencyMonths: null,
          durationMonths: null,
        },
      ],
    });

    expect(mapped).toMatchObject({ installedOn: undefined, startDate: undefined, frequencyMonths: undefined, years: undefined });
  });
});

describe("toRawAmcSchedules", () => {
  it("writes edited values back onto the raw schedule, converting years to months", () => {
    expect(toRawAmcSchedules([raw], [{ ...row, frequencyMonths: 12, years: 3 }])).toEqual([
      { ...raw, visitFrequencyMonths: 12, durationMonths: 36 },
    ]);
  });

  it("keeps schedules that have no matching row unchanged", () => {
    expect(toRawAmcSchedules([raw], [])).toEqual([raw]);
  });
});

describe("isAmcScheduleDirty", () => {
  it("is false when nothing changed", () => {
    expect(isAmcScheduleDirty([row], [{ ...row }])).toBe(false);
  });

  it.each([
    ["start date", { startDate: 2000 }],
    ["frequency", { frequencyMonths: 12 }],
    ["years", { years: 3 }],
  ])("is true when the %s changed", (_label, patch) => {
    expect(isAmcScheduleDirty([row], [{ ...row, ...patch }])).toBe(true);
  });
});

describe("validateAmcSchedules", () => {
  it("returns no errors when every row is complete", () => {
    expect(validateAmcSchedules([row])).toEqual([]);
  });

  it("lists each row that lost a value, with the missing fields", () => {
    expect(validateAmcSchedules([row, { ...row, id: "amc-2", startDate: undefined, years: undefined }])).toEqual([
      { id: "amc-2", endUserName: "user979", missing: ["startDate", "years"] },
    ]);
  });
});

describe("validateAmcSchedules and Pending Activation", () => {
  const notInstalled: AmcScheduleRow = { ...row, id: "amc-3", installedOn: undefined, startDate: undefined };

  it("allows a blank start date while the site is not installed", () => {
    expect(isPendingActivation(notInstalled)).toBe(true);
    expect(validateAmcSchedules([notInstalled])).toEqual([]);
  });

  it("still requires frequency and years for a not-installed site", () => {
    expect(validateAmcSchedules([{ ...notInstalled, years: undefined }])).toEqual([
      { id: "amc-3", endUserName: "user979", missing: ["years"] },
    ]);
  });

  it("is no longer pending once a start date is set", () => {
    expect(isPendingActivation({ ...notInstalled, startDate: 1000 })).toBe(false);
  });
});

describe("firstAmcDueDate and totalAmcActivities", () => {
  it("adds the frequency to the start date", () => {
    expect(firstAmcDueDate({ ...row, startDate: new Date(2026, 10, 6).getTime(), frequencyMonths: 6 })).toBe(
      new Date(2027, 4, 6).getTime(),
    );
  });

  it("has no due date without a start date", () => {
    expect(firstAmcDueDate({ ...row, startDate: undefined })).toBeUndefined();
  });

  it.each([
    [1, 6, 2],
    [2, 6, 4],
    [3, 12, 3],
  ])("%i year(s) at %i months gives %i AMCs", (years, frequencyMonths, total) => {
    expect(totalAmcActivities({ ...row, years, frequencyMonths })).toBe(total);
  });
});

describe("toAmcScheduleRows for a not-installed site", () => {
  it("ignores a start date stored before installation", () => {
    const [mapped] = toAmcScheduleRows({
      AmcSchedules: [{ ...raw, installationReportFirstSubmissionDate: null, configurationStartDate: 1000 }],
    });

    expect(mapped.startDate).toBeUndefined();
    expect(isPendingActivation(mapped)).toBe(true);
  });
});
