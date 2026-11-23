import { describe, expect, it } from "vitest";
import type { AmcScheduleRow, AmcScheduleSource, RawAmcConfiguration } from "../types/amc";
import {
  areAmcUpdatesSaved,
  firstAmcDueDate,
  isAmcScheduleDirty,
  isPendingActivation,
  isStartDateLocked,
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
  submittedVisits: 0,
};

const source = (configurations: RawAmcConfiguration[], visits: AmcScheduleSource["visits"] = []): AmcScheduleSource => ({
  configurations,
  visits,
});

describe("toAmcScheduleRows", () => {
  it("maps an AMC into a row, converting duration months to years", () => {
    expect(toAmcScheduleRows(source([raw]))).toEqual([row]);
  });

  it("returns no rows for a missing response", () => {
    expect(toAmcScheduleRows(undefined)).toEqual([]);
    expect(toAmcScheduleRows(source([]))).toEqual([]);
  });

  it("leaves blank values undefined and shows a dash for missing text", () => {
    const [mapped] = toAmcScheduleRows(
      source([
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
      ]),
    );

    expect(mapped).toMatchObject({
      endUserName: "-",
      phoneNumber: "-",
      installedOn: undefined,
      startDate: undefined,
      frequencyMonths: undefined,
      years: undefined,
    });
  });

  it("keeps one row per site: the running AMC, else the completed one, with its start date", () => {
    const completed = { ...raw, id: "amc-old", status: "COMPLETED" as const };
    expect(toAmcScheduleRows(source([completed, raw])).map((mapped) => mapped.id)).toEqual(["amc-1"]);
    expect(toAmcScheduleRows(source([completed]))).toEqual([
      expect.objectContaining({ id: "amc-old", status: "COMPLETED", startDate: 1000 }),
    ]);
  });

  it("counts each AMC's visits that were submitted at least once", () => {
    const [mapped] = toAmcScheduleRows(
      source([raw], [
        { id: "v1", amcConfigurationId: "amc-1", status: "APPROVED", firstSubmissionDate: 1 },
        { id: "v2", amcConfigurationId: "amc-1", status: "REJECTED", firstSubmissionDate: 2 },
        { id: "v3", amcConfigurationId: "amc-1", status: "SCHEDULED", firstSubmissionDate: null },
        { id: "v4", amcConfigurationId: "amc-9", status: "APPROVED", firstSubmissionDate: 3 },
      ]),
    );
    expect(mapped.submittedVisits).toBe(2);
  });

  it("shows no start date for a pending AMC", () => {
    const [mapped] = toAmcScheduleRows(
      source([{ ...raw, status: "PENDING_ACTIVATION", configurationStartDate: 1000, installationApprovedDate: null }]),
    );

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
      { id: "amc-2", endUserName: "user979", missing: ["startDate", "years"], problems: [] },
    ]);
  });

  it("allows a blank start date on a pending AMC but still requires frequency and years", () => {
    const pending: AmcScheduleRow = { ...row, id: "amc-3", status: "PENDING_ACTIVATION", installedOn: undefined, startDate: undefined };

    expect(validateAmcSchedules([pending])).toEqual([]);
    expect(validateAmcSchedules([{ ...pending, years: undefined }])).toEqual([
      { id: "amc-3", endUserName: "user979", missing: ["years"], problems: [] },
    ]);
  });

  it("refuses fewer visits than are already submitted", () => {
    expect(validateAmcSchedules([{ ...row, submittedVisits: 3, frequencyMonths: 12, years: 2 }])).toEqual([
      { id: "amc-1", endUserName: "user979", missing: [], problems: [{ kind: "TOTAL_BELOW_SUBMITTED", submitted: 3 }] },
    ]);
    expect(validateAmcSchedules([{ ...row, submittedVisits: 3, frequencyMonths: 6, years: 2 }])).toEqual([]);
  });

  it("refuses years that are not a whole number of visits", () => {
    expect(validateAmcSchedules([{ ...row, frequencyMonths: 5, years: 1 }])[0].problems).toEqual([{ kind: "NOT_WHOLE_VISITS" }]);
  });

  it("skips completed AMCs, which can't be edited", () => {
    expect(validateAmcSchedules([{ ...row, status: "COMPLETED", years: undefined }])).toEqual([]);
  });
});

describe("isStartDateLocked", () => {
  it("opens the start date only on an active AMC with no submitted visit", () => {
    expect(isStartDateLocked(row)).toBe(false);
    expect(isStartDateLocked({ ...row, submittedVisits: 1 })).toBe(true);
    expect(isStartDateLocked({ ...row, status: "PENDING_ACTIVATION" })).toBe(true);
    expect(isStartDateLocked({ ...row, status: "COMPLETED" })).toBe(true);
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
    const [mapped] = toAmcScheduleRows(source([{ ...raw, vendorId: "org-1", fieldStaff: { uuid: "s1", name: "Ravi" } }]));
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

describe("areAmcUpdatesSaved", () => {
  const saved: RawAmcConfiguration = {
    id: "amc-1",
    activityFacilityId: "row-1",
    status: "ACTIVE",
    visitFrequencyMonths: 6,
    durationMonths: 12,
    configurationStartDate: Date.UTC(2026, 10, 5, 18, 30),
    fieldStaff: { uuid: "s1" },
  };
  const update = { tenantId: "livelihood", id: "amc-1", visitFrequencyMonths: 6, durationMonths: 12 };

  it("compares frequency, years and the start day", () => {
    expect(areAmcUpdatesSaved([saved], [update], [])).toBe(true);
    expect(areAmcUpdatesSaved([saved], [{ ...update, durationMonths: 24 }], [])).toBe(false);
    expect(areAmcUpdatesSaved([saved], [{ ...update, configurationStartDate: Date.UTC(2026, 10, 6) }], [])).toBe(true);
    expect(areAmcUpdatesSaved([saved], [{ ...update, configurationStartDate: Date.UTC(2026, 10, 8) }], [])).toBe(false);
  });

  it("compares the field staff, and is not saved while the AMC is missing", () => {
    const staff = { tenantId: "livelihood", activityFacilityId: "row-1", fieldStaffUserId: "s1" };
    expect(areAmcUpdatesSaved([saved], [], [staff])).toBe(true);
    expect(areAmcUpdatesSaved([saved], [], [{ ...staff, fieldStaffUserId: "s2" }])).toBe(false);
    expect(areAmcUpdatesSaved([], [update], [])).toBe(false);
  });
});
