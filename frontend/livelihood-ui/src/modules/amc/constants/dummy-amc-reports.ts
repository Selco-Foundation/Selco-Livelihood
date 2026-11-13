import type {
  AmcApprovedBy,
  AmcReport,
  AmcReportHistoryEntry,
  AmcReportSection,
  AmcReportStatus,
  AmcRuleResult,
} from "../types/amc-report";

// Prototype-only seed for the static AMC report service. Dates are relative to `now`, so the SLA
// colours always have something to show. Form section fields are placeholders until the client's
// "Livelihood AMC report form final field list" arrives. Delete with the static service once the
// AMC report API exists.

const DAY = 24 * 60 * 60 * 1000;

const PROJECTS = [
  { id: "amc-proj-1", name: "JUS-12345-26-26", planCode: "IN-INS-2026-28" },
  { id: "amc-proj-2", name: "KAR-20011-26-02", planCode: "IN-INS-2026-31" },
  { id: "amc-proj-3", name: "ASM-30420-26-05", planCode: "IN-INS-2026-35" },
];

const VENDORS = ["Surya Power Solutions", "Green Grid Services", "Udaya Solar Pvt Ltd"];

type RuleCode = "NE_PCU" | "NE_GRID" | "INVERTER_OUTPUT" | "EARTH_ELECTRODE" | "EARTH_WIRE" | "DC_SPD" | "AC_SPD";

const RULES: Array<{ code: RuleCode; label: string; acceptedRange: string; rangeKey: string; pass: string; fail: string }> = [
  { code: "NE_PCU", label: "Neutral to earth voltage at PCU output", acceptedRange: "Less than 7 V", rangeKey: "ES_AMC_RANGE_LESS_THAN_7V", pass: "2.4 V", fail: "9 V" },
  { code: "NE_GRID", label: "Neutral to earth voltage for grid input", acceptedRange: "Less than 7 V", rangeKey: "ES_AMC_RANGE_LESS_THAN_7V", pass: "3.1 V", fail: "8.2 V" },
  { code: "INVERTER_OUTPUT", label: "Inverter output voltage (solar and grid disconnected, battery connected)", acceptedRange: "Between 215 V and 250 V", rangeKey: "ES_AMC_RANGE_215_250V", pass: "232 V", fail: "204 V" },
  { code: "EARTH_ELECTRODE", label: "Earthing electrode available", acceptedRange: "Yes", rangeKey: "ES_AMC_RANGE_YES", pass: "Yes", fail: "No" },
  { code: "EARTH_WIRE", label: "Earthing wire connected to earth pit", acceptedRange: "Yes", rangeKey: "ES_AMC_RANGE_YES", pass: "Yes", fail: "No" },
  { code: "DC_SPD", label: "Solar (DC) SPD", acceptedRange: "Working", rangeKey: "ES_AMC_RANGE_WORKING", pass: "Working", fail: "Not working" },
  { code: "AC_SPD", label: "Grid input (AC) SPD", acceptedRange: "Working", rangeKey: "ES_AMC_RANGE_WORKING", pass: "Working", fail: "Not working" },
];

function buildRuleResults(failed: RuleCode[]): AmcRuleResult[] {
  return RULES.map((rule) => {
    const passed = !failed.includes(rule.code);
    return {
      code: rule.code,
      labelKey: `ES_AMC_RULE_${rule.code}`,
      label: rule.label,
      reading: passed ? rule.pass : rule.fail,
      acceptedRangeKey: rule.rangeKey,
      acceptedRange: rule.acceptedRange,
      passed,
    };
  });
}

function reading(results: AmcRuleResult[], code: RuleCode): string {
  return results.find((result) => result.code === code)?.reading ?? "-";
}

function buildSections(endUserName: string, vendorName: string, visitDate: number, results: AmcRuleResult[]): AmcReportSection[] {
  const field = (code: string, label: string, value: string) => ({ labelKey: `ES_AMC_FIELD_${code}`, label, value });
  return [
    {
      code: "REPORT_HEADER",
      titleKey: "ES_AMC_SECTION_REPORT_HEADER",
      title: "Report Header",
      fields: [
        field("SERVICE_PERSON", "Service person name", "Ramesh K"),
        field("SERVICE_PERSON_PHONE", "Service person contact number", "9000012345"),
        field("VENDOR", "Vendor", vendorName),
        field("VISIT_DATE", "Visit date", new Date(visitDate).toLocaleDateString("en-GB")),
      ],
    },
    {
      code: "SITE_DETAILS",
      titleKey: "ES_AMC_SECTION_SITE_DETAILS",
      title: "Site Details",
      fields: [
        field("END_USER", "End user", endUserName),
        field("SYSTEM_TYPE", "System type", "AC off-grid, single phase"),
        field("SYSTEM_CAPACITY", "System capacity", "1 kWp"),
        field("BATTERY_TYPE", "Battery type", "Lead Acid"),
      ],
    },
    {
      code: "CHARGE_CONTROLLER",
      titleKey: "ES_AMC_SECTION_CHARGE_CONTROLLER",
      title: "Charge Controller / PCU",
      fields: [
        field("PCU_STATUS", "PCU status", "Working"),
        field("NE_PCU", "Neutral to earth voltage at PCU output", reading(results, "NE_PCU")),
        field("PCU_DISPLAY", "PCU display readable", "Yes"),
      ],
    },
    {
      code: "OBSERVATION_POINTS",
      titleKey: "ES_AMC_SECTION_OBSERVATION_POINTS",
      title: "Observation Points",
      fields: [
        field("EARTH_ELECTRODE", "Earthing electrode available", reading(results, "EARTH_ELECTRODE")),
        field("EARTH_WIRE", "Earthing wire connected to earth pit", reading(results, "EARTH_WIRE")),
        field("DC_SPD", "Solar (DC) SPD", reading(results, "DC_SPD")),
        field("AC_SPD", "Grid input (AC) SPD", reading(results, "AC_SPD")),
        field("PANEL_CLEANING", "Panels cleaned", "Yes"),
      ],
    },
    {
      code: "CAPTURE_READINGS",
      titleKey: "ES_AMC_SECTION_CAPTURE_READINGS",
      title: "Capture Readings",
      fields: [
        field("INVERTER_OUTPUT", "Inverter output voltage", reading(results, "INVERTER_OUTPUT")),
        field("NE_GRID", "Neutral to earth voltage for grid input", reading(results, "NE_GRID")),
        field("BATTERY_SG", "Battery specific gravity", "1.21"),
      ],
    },
  ];
}

const PHOTO_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#e7efe9"/>' +
      '<text x="160" y="105" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#134738">Field staff with end user (sample)</text></svg>',
  );

interface Spec {
  project: number;
  endUser: string;
  phone: string;
  state: string;
  district: string;
  block: string;
  vendor: number;
  amcNumber: number;
  totalAmcs: number;
  firstSubmittedDaysAgo: number;
  latestSubmittedDaysAgo: number;
  status: AmcReportStatus;
  approvedBy?: AmcApprovedBy;
  functional?: boolean;
  inUse?: boolean;
  failed?: RuleCode[];
  reworkReason?: string;
}

const SPECS: Spec[] = [
  { project: 0, endUser: "user979", phone: "9876543210", state: "Assam", district: "Kamrup", block: "Rangia", vendor: 0, amcNumber: 1, totalAmcs: 2, firstSubmittedDaysAgo: 1, latestSubmittedDaysAgo: 1, status: "PENDING_APPROVAL", failed: ["NE_PCU"] },
  { project: 0, endUser: "user981", phone: "9701233458", state: "Assam", district: "Barpeta", block: "Sorbhog", vendor: 1, amcNumber: 2, totalAmcs: 4, firstSubmittedDaysAgo: 5, latestSubmittedDaysAgo: 5, status: "PENDING_APPROVAL", failed: ["INVERTER_OUTPUT", "EARTH_WIRE"] },
  { project: 0, endUser: "user984", phone: "9678044123", state: "Assam", district: "Kamrup", block: "Chaygaon", vendor: 0, amcNumber: 1, totalAmcs: 2, firstSubmittedDaysAgo: 9, latestSubmittedDaysAgo: 9, status: "PENDING_APPROVAL", functional: false, failed: ["DC_SPD"] },
  { project: 1, endUser: "user980", phone: "9845012876", state: "Karnataka", district: "Tumakuru", block: "Gubbi", vendor: 2, amcNumber: 1, totalAmcs: 2, firstSubmittedDaysAgo: 12, latestSubmittedDaysAgo: 2, status: "PENDING_APPROVAL", failed: ["EARTH_ELECTRODE"], reworkReason: "Selfie is blurred; please retake the photo with the end user and the system visible." },
  { project: 1, endUser: "user982", phone: "9900156782", state: "Karnataka", district: "Mandya", block: "Maddur", vendor: 2, amcNumber: 3, totalAmcs: 3, firstSubmittedDaysAgo: 6, latestSubmittedDaysAgo: 6, status: "PENDING_APPROVAL", failed: ["NE_GRID"] },
  { project: 1, endUser: "user983", phone: "9886090421", state: "Karnataka", district: "Tumakuru", block: "Sira", vendor: 1, amcNumber: 1, totalAmcs: 2, firstSubmittedDaysAgo: 11, latestSubmittedDaysAgo: 11, status: "PENDING_APPROVAL", inUse: false, failed: ["AC_SPD", "NE_PCU"] },
  { project: 2, endUser: "user986", phone: "9435067890", state: "Assam", district: "Barpeta", block: "Barpeta", vendor: 0, amcNumber: 1, totalAmcs: 2, firstSubmittedDaysAgo: 3, latestSubmittedDaysAgo: 3, status: "PENDING_APPROVAL", failed: ["EARTH_WIRE"] },
  { project: 0, endUser: "user990", phone: "9812300011", state: "Assam", district: "Kamrup", block: "Rangia", vendor: 1, amcNumber: 1, totalAmcs: 2, firstSubmittedDaysAgo: 8, latestSubmittedDaysAgo: 4, status: "REJECTED", failed: ["INVERTER_OUTPUT"], reworkReason: "Inverter reading looks wrong; re-measure with the battery connected." },
  { project: 1, endUser: "user985", phone: "9448123456", state: "Karnataka", district: "Mandya", block: "Malavalli", vendor: 2, amcNumber: 2, totalAmcs: 4, firstSubmittedDaysAgo: 15, latestSubmittedDaysAgo: 15, status: "APPROVED", approvedBy: "REVIEWER", failed: ["NE_GRID"] },
  { project: 0, endUser: "user991", phone: "9812300022", state: "Assam", district: "Barpeta", block: "Sorbhog", vendor: 0, amcNumber: 1, totalAmcs: 2, firstSubmittedDaysAgo: 2, latestSubmittedDaysAgo: 2, status: "APPROVED", approvedBy: "SYSTEM" },
  { project: 0, endUser: "user992", phone: "9812300033", state: "Assam", district: "Kamrup", block: "Chaygaon", vendor: 1, amcNumber: 2, totalAmcs: 2, firstSubmittedDaysAgo: 4, latestSubmittedDaysAgo: 4, status: "APPROVED", approvedBy: "SYSTEM" },
  { project: 1, endUser: "user993", phone: "9812300044", state: "Karnataka", district: "Tumakuru", block: "Gubbi", vendor: 2, amcNumber: 1, totalAmcs: 6, firstSubmittedDaysAgo: 1, latestSubmittedDaysAgo: 1, status: "APPROVED", approvedBy: "SYSTEM" },
  { project: 1, endUser: "user994", phone: "9812300055", state: "Karnataka", district: "Mandya", block: "Maddur", vendor: 1, amcNumber: 1, totalAmcs: 2, firstSubmittedDaysAgo: 7, latestSubmittedDaysAgo: 7, status: "APPROVED", approvedBy: "SYSTEM" },
  { project: 2, endUser: "user995", phone: "9812300066", state: "Assam", district: "Barpeta", block: "Barpeta", vendor: 0, amcNumber: 3, totalAmcs: 4, firstSubmittedDaysAgo: 10, latestSubmittedDaysAgo: 10, status: "APPROVED", approvedBy: "SYSTEM" },
  { project: 2, endUser: "user996", phone: "9812300077", state: "Assam", district: "Kamrup", block: "Rangia", vendor: 2, amcNumber: 1, totalAmcs: 2, firstSubmittedDaysAgo: 3, latestSubmittedDaysAgo: 3, status: "APPROVED", approvedBy: "SYSTEM" },
];

function buildHistory(spec: Spec, firstSubmission: number, latestSubmission: number): AmcReportHistoryEntry[] {
  const vendor = VENDORS[spec.vendor];
  const history: AmcReportHistoryEntry[] = [{ action: "SUBMITTED", actor: vendor, date: firstSubmission }];
  if (spec.approvedBy === "SYSTEM") {
    history.push({ action: "AUTO_APPROVED", actor: "System", date: firstSubmission });
    return history;
  }
  history.push({ action: "SENT_TO_REVIEW", actor: "System", date: firstSubmission });
  if (spec.reworkReason) {
    const reworkDate = spec.status === "REJECTED" ? latestSubmission : firstSubmission + DAY;
    history.push({ action: "SENT_FOR_REWORK", actor: "AMC Reviewer", date: reworkDate, comment: spec.reworkReason });
    if (spec.status !== "REJECTED") {
      history.push({ action: "RESUBMITTED", actor: vendor, date: latestSubmission });
      history.push({ action: "SENT_TO_REVIEW", actor: "System", date: latestSubmission });
    }
  }
  if (spec.status === "APPROVED") {
    history.push({ action: "APPROVED", actor: "AMC Reviewer", date: latestSubmission + DAY });
  }
  return history;
}

export function buildDummyAmcReports(now: number): AmcReport[] {
  return SPECS.map((spec, index) => {
    const project = PROJECTS[spec.project];
    const vendorName = VENDORS[spec.vendor];
    const firstSubmissionDate = now - spec.firstSubmittedDaysAgo * DAY;
    const latestSubmissionDate = now - spec.latestSubmittedDaysAgo * DAY;
    const ruleResults = buildRuleResults(spec.failed ?? []);
    return {
      id: `amc-report-${index + 1}`,
      projectId: project.id,
      projectName: project.name,
      planCode: project.planCode,
      endUserName: spec.endUser,
      endUserPhone: spec.phone,
      state: spec.state,
      district: spec.district,
      block: spec.block,
      vendorName,
      amcNumber: spec.amcNumber,
      totalAmcs: spec.totalAmcs,
      scheduledDate: firstSubmissionDate + 5 * DAY,
      firstSubmissionDate,
      latestSubmissionDate,
      status: spec.status,
      approvedBy: spec.approvedBy,
      systemInUse: spec.inUse ?? true,
      systemFunctional: spec.functional ?? true,
      ruleResults,
      sections: buildSections(spec.endUser, vendorName, firstSubmissionDate, ruleResults),
      photoUrl: PHOTO_URL,
      history: buildHistory(spec, firstSubmissionDate, latestSubmissionDate),
    };
  });
}
