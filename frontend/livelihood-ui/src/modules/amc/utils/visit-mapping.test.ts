import { describe, expect, it } from "vitest";
import type { RawAmcVisit } from "../types/amc-visit";
import { formatAnswer, parseReworkComment, toAmcProjectSummary, toAmcReport } from "./visit-mapping";

function rawVisit(overrides: Partial<RawAmcVisit> = {}): RawAmcVisit {
  return {
    id: "v1",
    projectId: "p1",
    facilityId: "ED/2026/0144",
    facility: { facility_name: "name1", facility_poc_phone: "6753325754" },
    state: "Karnataka",
    district: "Haveri",
    block: "Haveri",
    vendorName: "Bright Future Energy",
    fieldStaff: { uuid: "fs1", name: "amcField" },
    visitNumber: 2,
    totalVisits: 12,
    status: "PENDING_APPROVAL",
    slaDaysRemaining: 7,
    slaBreached: false,
    siteDetails: { pinCode: "560078", batteryType: "Lithium", installationDate: Date.UTC(2026, 10, 19) },
    visitReport: {
      responses: {
        visitDate: "2026-11-20",
        pcuPriority: "SOLAR_BATTERY_GRID",
        obsPanelsClean: "YES",
        obsCableLugsUsed: "NO",
        neVoltagePcuOutput: 5,
        newField: "abc",
      },
      documents: [
        { documentType: "AMC_PHOTO_NE_PCU", fileStoreId: "f2" },
        { documentType: "AMC_VERIFICATION_PHOTO", fileStoreId: "f1" },
      ],
    },
    additionalDetails: {
      reportPdf: { fileStoreId: "pdf1" },
      systemStatus: { isSystemInUse: true, isSystemFunctional: false },
      autoApproval: {
        passed: false,
        rules: [
          { code: "GRID_SPD_STATUS", fieldName: "gridSpdStatus", reading: null, passed: false, acceptedRange: "Working" },
          { code: "NE_VOLTAGE_PCU_OUTPUT", fieldName: "neVoltagePcuOutput", reading: 5, unit: "V", passed: true },
          { code: "SKIPPED", reading: null, passed: false, applicable: false },
        ],
      },
    },
    processInstances: [
      { action: "REJECT", comment: '[{"reason":"OTHERS","comment":"Retake"}]', assigner: { name: "Rev" }, auditDetails: { createdTime: 3 } },
      { action: "SUBMIT_VISIT_REPORT", comment: null, assigner: { name: "amcField" }, auditDetails: { createdTime: 2 } },
      { action: "SCHEDULE", comment: "AMC visit 2 created", assigner: { name: "Cron" }, auditDetails: { createdTime: 1 } },
    ],
    ...overrides,
  };
}

describe("toAmcReport", () => {
  const report = toAmcReport(rawVisit());

  it("takes the end user, place, vendor, visit number and SLA from the visit", () => {
    expect(report).toMatchObject({
      endUserName: "name1",
      endUserPhone: "6753325754",
      vendorName: "Bright Future Energy",
      fieldStaffName: "amcField",
      visitNumber: 2,
      totalVisits: 12,
      sla: { daysRemaining: 7, breached: false },
      systemInUse: true,
      systemFunctional: false,
      reportPdfFileStoreId: "pdf1",
    });
  });

  it("keeps the SLA only while the report waits for review", () => {
    expect(toAmcReport(rawVisit({ status: "APPROVED", approvedBy: "REVIEWER" })).sla).toBeUndefined();
  });

  it("groups the answers like the form, with readable values, and keeps unknown keys", () => {
    const sections = Object.fromEntries(report.sections.map((section) => [section.code, section.fields]));
    expect(Object.keys(sections)).toEqual(["REPORT_HEADER", "SITE_DETAILS", "PCU", "OBSERVATIONS", "READINGS", "OTHER"]);
    expect(sections.REPORT_HEADER).toEqual([expect.objectContaining({ label: "Date of visit", value: "20 Nov 2026" })]);
    expect(sections.PCU[0].value).toBe("Solar-Battery-Grid");
    expect(sections.OBSERVATIONS.map((item) => [item.label, item.value])).toEqual([
      ["Are the panels clean?", "Yes"],
      ["Cable lugs used", "No"],
    ]);
    expect(sections.READINGS[0].value).toBe("5 V");
    expect(sections.OTHER).toEqual([expect.objectContaining({ label: "New field", value: "abc" })]);
    expect(sections.SITE_DETAILS).toContainEqual(expect.objectContaining({ label: "Battery type", value: "Lithium" }));
    expect(sections.SITE_DETAILS).toContainEqual(expect.objectContaining({ label: "PIN code", value: "560078" }));
  });

  it("lists the applicable rules with a readable reading", () => {
    expect(report.ruleResults.map((rule) => [rule.label, rule.reading, rule.passed])).toEqual([
      ["Grid input SPD", "Not entered", false],
      ["Neutral to earth voltage at PCU output (V)", "5 V", true],
    ]);
  });

  it("orders the photos with the verification photo first", () => {
    expect(report.photos.map((photo) => photo.fileStoreId)).toEqual(["f1", "f2"]);
  });

  it("gives the history latest first, with the rework reasons parsed", () => {
    expect(report.history.map((entry) => entry.action)).toEqual(["REJECT", "SUBMIT_VISIT_REPORT", "SCHEDULE"]);
    expect(report.history[2].comment).toBe("AMC visit 2 created");
    expect(report.history[0].reasons).toEqual([{ code: "OTHERS", comment: "Retake" }]);
  });
});

describe("parseReworkComment / formatAnswer / toAmcProjectSummary", () => {
  it("reads only a JSON list of reasons", () => {
    expect(parseReworkComment('[{"reason":"A"},{"reason":"B","comment":"x"}]')).toEqual([
      { reason: "A", comment: undefined },
      { reason: "B", comment: "x" },
    ]);
    expect(parseReworkComment("plain text")).toBeUndefined();
  });

  it("formats coded and empty answers", () => {
    expect(formatAnswer("na")).toBe("N/A");
    expect(formatAnswer(null)).toBe("-");
    expect(formatAnswer(230, "V")).toBe("230 V");
  });

  it("fills missing project counts with zero", () => {
    expect(toAmcProjectSummary({ projectId: "p1", projectNumber: "PROJ/1" })).toMatchObject({
      projectName: "PROJ/1",
      pendingCount: 0,
      states: [],
    });
  });
});
