import { describe, expect, it } from "vitest";
import type { AmcScheduleRow, RawAmcConfiguration } from "../types/amc";
import {
  firstAmcDueDate,
  isAmcScheduleDirty,
  isPendingActivation,
  toAmcConfigurationUpdates,
  toAmcFieldStaffUpdates,
  toAmcScheduleRows,
  totalAmcActivities,
  validateAmcSchedules,
} from "./amc-schedule";

const raw: RawAmcConfiguration = {
  id: "amc-1",
  status: "ACTIVE",
  activityFacilityId: "row-1",
  visitFrequencyMonths: 6,
  durationMonths: 24,
  configurationStartDate: 1000,
  endUserName: "user979",
  endUserPhone: "9876543210",
  state: "Assam",
  district: "Kamrup",
  block: "Rangia",
  installationApprovedDate: 900,
};

const row: AmcScheduleRow = {
  id: "amc-1",
  activityFacilityId: "row-1",
  status: "ACTIVE",
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
  it("maps an AMC into a row, converting duration months to years", () => {
    expect(toAmcScheduleRows({ AmcConfigurations: [raw] })).toEqual([row]);
  });

  it("returns no rows for a missing response", () => {
    expect(toAmcScheduleRows(undefined)).toEqual([]);
    expect(toAmcScheduleRows({})).toEqual([]);
  });

  it("leaves blank values undefined and shows a dash for missing text", () => {
    const [mapped] = toAmcScheduleRows({
      AmcConfigurations: [
        {
          id: "amc-2",
          status: "ACTIVE",
          activityFacilityId: "row-2",
          visitFrequencyMonths: null,
          durationMonths: null,
          configurationStartDate: null,
          installationApprovedDate: null,
          endUserName: null,
        },
      ],
    });

    expect(mapped).toMatchObject({
      endUserName: "-",
      phoneNumber: "-",
      installedOn: undefined,
      startDate: undefined,
      frequencyMonths: undefined,
      years: undefined,
    });
  });

  it("drops completed and cancelled AMCs", () => {
    expect(
      toAmcScheduleRows({ AmcConfigurations: [{ ...raw, status: "COMPLETED" }, { ...raw, id: "amc-3", status: "CANCELLED" }] }),
    ).toEqual([]);
  });

  it("shows no start date for a pending AMC", () => {
    const [mapped] = toAmcScheduleRows({
      AmcConfigurations: [{ ...raw, status: "PENDING_ACTIVATION", configurationStartDate: 1000, installationApprovedDate: null }],
    });

    expect(mapped.startDate).toBeUndefined();
    expect(isPendingActivation(mapped)).toBe(true);
  });
});

describe("toAmcConfigurationUpdates", () => {
  it("sends nothing when no row changed", () => {
    expect(toAmcConfigurationUpdates([row], [{ ...row }], "livelihood")).toEqual([]);
  });

  it("sends the minimal body for a changed row, converting years to months", () => {
    expect(toAmcConfigurationUpdates([row], [{ ...row, frequencyMonths: 12, years: 3 }], "livelihood")).toEqual([
      { tenantId: "livelihood", id: "amc-1", visitFrequencyMonths: 12, durationMonths: 36 },
    ]);
  });

  it("sends the start date only when it changed", () => {
    expect(toAmcConfigurationUpdates([row], [{ ...row, startDate: 2000 }], "livelihood")).toEqual([
      { tenantId: "livelihood", id: "amc-1", visitFrequencyMonths: 6, durationMonths: 24, configurationStartDate: 2000 },
    ]);
  });

  it("never sends a start date for a pending AMC", () => {
    const pending: AmcScheduleRow = { ...row, status: "PENDING_ACTIVATION", startDate: undefined, installedOn: undefined };
    expect(toAmcConfigurationUpdates([pending], [{ ...pending, startDate: 5000, years: 3 }], "livelihood")).toEqual([
      { tenantId: "livelihood", id: "amc-1", visitFrequencyMonths: 6, durationMonths: 36 },
    ]);
  });

  it("skips only the rows that did not change", () => {
    const other: AmcScheduleRow = { ...row, id: "amc-2" };
    expect(toAmcConfigurationUpdates([row, other], [row, { ...other, years: 1 }], "livelihood")).toEqual([
      { tenantId: "livelihood", id: "amc-2", visitFrequencyMonths: 6, durationMonths: 12 },
    ]);
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

  it("allows a blank start date on a pending AMC but still requires frequency and years", () => {
    const pending: AmcScheduleRow = { ...row, id: "amc-3", status: "PENDING_ACTIVATION", installedOn: undefined, startDate: undefined };

    expect(validateAmcSchedules([pending])).toEqual([]);
    expect(validateAmcSchedules([{ ...pending, years: undefined }])).toEqual([
      { id: "amc-3", endUserName: "user979", missing: ["years"] },
    ]);
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

describe("field staff changes", () => {
  const withStaff = { ...row, fieldStaffId: "s1" };

  it("reads the field staff and organisation off the search row", () => {
    const [mapped] = toAmcScheduleRows({
      AmcConfigurations: [{ ...raw, vendorId: "org-1", fieldStaff: { uuid: "s1", name: "Ravi" } }],
    });
    expect(mapped).toMatchObject({ vendorOrgId: "org-1", fieldStaffId: "s1", fieldStaffName: "Ravi" });
  });

  it("builds an update only for rows whose field staff changed", () => {
    expect(toAmcFieldStaffUpdates([withStaff], [{ ...withStaff, fieldStaffId: "s2" }], "livelihood")).toEqual([
      { tenantId: "livelihood", activityFacilityId: "row-1", fieldStaffUserId: "s2" },
    ]);
    expect(toAmcFieldStaffUpdates([withStaff], [{ ...withStaff }], "livelihood")).toEqual([]);
    expect(toAmcFieldStaffUpdates([withStaff], [{ ...withStaff, fieldStaffId: "" }], "livelihood")).toEqual([]);
  });

  it("a field staff change alone makes the schedule dirty but sends no schedule update", () => {
    const edited = { ...withStaff, fieldStaffId: "s2" };
    expect(isAmcScheduleDirty([withStaff], [edited])).toBe(true);
    expect(toAmcConfigurationUpdates([withStaff], [edited], "livelihood")).toEqual([]);
  });
});
