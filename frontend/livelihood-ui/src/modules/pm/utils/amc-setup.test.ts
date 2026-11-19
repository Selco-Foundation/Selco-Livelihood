import { describe, expect, it } from "vitest";
import {
  amcApplicableKey,
  rowsMissingFieldStaff,
  toAmcBySite,
  toAmcChoices,
  toAmcCreateRows,
  withAmcApplicable,
  withAmcApplicableForAll,
  withAmcFieldStaff,
  type AmcRowRef,
} from "./amc-setup";

const solar: AmcRowRef = { facilityId: "f1", componentType: "SOLAR", componentSequence: 1 };
const machine: AmcRowRef = { facilityId: "f1", componentType: "MACHINE", componentSequence: 1 };

describe("amc setup", () => {
  it("keys a solar row by site and sequence", () => {
    expect(amcApplicableKey(solar)).toBe("f1:SOLAR:1");
  });

  it("turning a row off drops the field staff picked so far", () => {
    const on = withAmcFieldStaff({}, solar, { id: "s1", name: "Ravi" });
    expect(withAmcApplicable(on, solar, false)).toEqual({ "f1:SOLAR:1": { applicable: false } });
  });

  it("turning a row back on keeps the field staff", () => {
    const on = withAmcFieldStaff({}, solar, { id: "s1", name: "Ravi" });
    expect(withAmcApplicable(on, solar, true)["f1:SOLAR:1"]).toMatchObject({ applicable: true, fieldStaffId: "s1" });
  });

  it("apply for all flags every solar row and skips machine rows", () => {
    expect(withAmcApplicableForAll({}, [solar, machine], true)).toEqual({ "f1:SOLAR:1": { applicable: true } });
  });

  it("flags solar rows with AMC on and no field staff", () => {
    const on = withAmcApplicable({}, solar, true);
    expect(rowsMissingFieldStaff(on, [solar, machine])).toEqual([solar]);
    expect(rowsMissingFieldStaff(withAmcFieldStaff(on, solar, { id: "s1" }), [solar])).toEqual([]);
    expect(rowsMissingFieldStaff({}, [solar])).toEqual([]);
  });

  it("keys each running AMC by its site", () => {
    const amc = { id: "amc-1", status: "ACTIVE" as const, activityFacilityId: "af1" };
    expect(toAmcBySite([{ activityFacility: { id: "af1", facilityId: "site-1" } }], [amc])).toEqual({ "site-1": amc });
    expect(toAmcBySite([], [amc])).toEqual({});
  });
});

describe("create rows", () => {
  const ready = withAmcFieldStaff(withAmcApplicable({}, solar, true), solar, { id: "s1" });
  const assignments = [{ facilityId: "f1", componentType: "SOLAR", vendorOrgId: "org-1" }];

  it("picks sites with AMC on, a field staff and a solar vendor organisation", () => {
    expect(toAmcChoices(ready, [solar, machine], assignments)).toEqual([
      { facilityId: "f1", vendorOrgId: "org-1", fieldStaffId: "s1" },
    ]);
    expect(toAmcChoices(withAmcApplicable({}, solar, true), [solar], assignments)).toEqual([]);
    expect(toAmcChoices(ready, [solar], [])).toEqual([]);
  });

  it("takes the MDMS default frequency and years, and leaves the start date out before approval", () => {
    const facilities = [{ activityFacility: { id: "af1", facilityId: "f1", status: "ASSIGNED_TO_FIELD_STAFF" } }];
    expect(toAmcCreateRows(facilities, toAmcChoices(ready, [solar], assignments), "livelihood", 123, { frequencyMonths: 6, years: 1 })).toEqual([
      {
        tenantId: "livelihood",
        activityFacilityId: "af1",
        visitFrequencyMonths: 6,
        durationMonths: 12,
        vendorOrgId: "org-1",
        amcFieldStaffId: "s1",
      },
    ]);
  });

  it("adds today's start date for an approved installation and honours chosen frequency and years", () => {
    const facilities = [{ activityFacility: { id: "af1", facilityId: "f1", status: "APPROVED_BY_QC_SPOC" } }];
    const [row] = toAmcCreateRows(
      facilities,
      [{ facilityId: "f1", vendorOrgId: "org-1", fieldStaffId: "s1", frequencyMonths: 12, years: 2 }],
      "livelihood",
      123,
    );
    expect(row).toMatchObject({ configurationStartDate: 123, visitFrequencyMonths: 12, durationMonths: 24 });
  });

  it("refuses to guess when no default is configured", () => {
    const facilities = [{ activityFacility: { id: "af1", facilityId: "f1" } }];
    expect(() => toAmcCreateRows(facilities, toAmcChoices(ready, [solar], assignments), "livelihood", 1)).toThrow(
      "No default AMC frequency or duration",
    );
  });

  it("skips a site that has no installation row", () => {
    expect(toAmcCreateRows([], [{ facilityId: "f1", vendorOrgId: "o", fieldStaffId: "s" }], "livelihood", 1)).toEqual([]);
  });
});
