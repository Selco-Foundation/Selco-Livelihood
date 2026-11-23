import { format, isValid, parseISO } from "date-fns";
import { AMC_ANSWER_LABELS, AMC_FORM_SECTIONS, AMC_PHOTO_TYPES, type AmcFormField } from "../constants/report-form";
import type {
  AmcProjectSummary,
  AmcReport,
  AmcReportField,
  AmcReportHistoryEntry,
  AmcReportPhoto,
  AmcReportSection,
  AmcRuleResult,
} from "../types/amc-report";
import type { AmcReworkReason, RawAmcProcessInstance, RawAmcProjectSummary, RawAmcVisit } from "../types/amc-visit";

/** `obsCableLugsUsed` -> `OBS_CABLE_LUGS_USED`, for localization keys. */
function toKeyCase(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

/** A label for a form key the screen does not know yet: `obsCableLugsUsed` -> "Cable lugs used". */
function humanize(key: string): string {
  const words = key
    .replace(/^obs(?=[A-Z])/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatDay(value: number | string): string {
  const date = typeof value === "number" ? new Date(value) : parseISO(value);
  return isValid(date) ? format(date, "dd MMM yyyy") : String(value);
}

/** Display text of one answer: coded answers get their label, numbers their unit. */
export function formatAnswer(value: unknown, unit?: string | null): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return unit ? `${value} ${unit}` : String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const text = String(value);
  return AMC_ANSWER_LABELS[text.toUpperCase()] ?? text;
}

function field(key: string, label: string, value: string): AmcReportField {
  return { labelKey: `ES_AMC_FIELD_${toKeyCase(key)}`, label, value };
}

function answerField(formField: AmcFormField, value: unknown): AmcReportField {
  const text = formField.key === "visitDate" && typeof value === "string" ? formatDay(value) : formatAnswer(value, formField.unit);
  return field(formField.key, formField.label, text);
}

function siteSection(visit: RawAmcVisit): AmcReportSection {
  const site = visit.siteDetails ?? {};
  return {
    code: "SITE_DETAILS",
    titleKey: "ES_AMC_SECTION_SITE_DETAILS",
    title: "Site details",
    fields: [
      field("endUserName", "End user name", endUserName(visit)),
      field("endUserPhone", "Contact number", visit.facility?.facility_poc_phone ?? "-"),
      field("installationDate", "Date of installation", site.installationDate ? formatDay(site.installationDate) : "-"),
      field("block", "Taluk / Block", visit.block ?? "-"),
      field("district", "District", visit.district ?? "-"),
      field("purchaseOrderNumber", "Purchase order no", site.purchaseOrderNumber ?? "-"),
      field("batteryType", "Battery type", site.batteryType ?? "-"),
      field("systemType", "System type", site.systemType ?? "-"),
    ],
  };
}

/** The report's answers grouped like the form; empty sections are left out. */
export function toReportSections(visit: RawAmcVisit): AmcReportSection[] {
  const responses = visit.visitReport?.responses ?? {};
  const known = new Set(AMC_FORM_SECTIONS.flatMap((section) => section.fields.map((formField) => formField.key)));
  const unknownKeys = Object.keys(responses).filter((key) => !known.has(key));

  const sections = AMC_FORM_SECTIONS.map((section) => {
    const extra = section.code === "OBSERVATIONS" ? unknownKeys.filter((key) => key.startsWith("obs")) : [];
    const fields = [
      ...section.fields.filter((formField) => formField.key in responses).map((formField) => answerField(formField, responses[formField.key])),
      ...extra.map((key) => field(key, humanize(key), formatAnswer(responses[key]))),
    ];
    return { code: section.code, titleKey: `ES_AMC_SECTION_${section.code}`, title: section.title, fields };
  });
  const others = unknownKeys.filter((key) => !key.startsWith("obs"));
  sections.push({
    code: "OTHER",
    titleKey: "ES_AMC_SECTION_OTHER",
    title: "Other answers",
    fields: others.map((key) => field(key, humanize(key), formatAnswer(responses[key]))),
  });

  return [siteSection(visit), ...sections.filter((section) => section.fields.length > 0)];
}

const FORM_FIELDS = new Map(AMC_FORM_SECTIONS.flatMap((section) => section.fields).map((formField) => [formField.key, formField]));

/** The auto-approval rules that applied to this report, with each reading's verdict. */
export function toRuleResults(visit: RawAmcVisit): AmcRuleResult[] {
  return (visit.additionalDetails?.autoApproval?.rules ?? [])
    .filter((rule) => rule.applicable !== false)
    .map((rule) => {
      const formField = rule.fieldName ? FORM_FIELDS.get(rule.fieldName) : undefined;
      const missing = rule.reading === null || rule.reading === undefined || rule.reading === "";
      return {
        code: rule.code,
        labelKey: rule.labelKey ?? `AMC_RULE_${rule.code}`,
        label: formField?.label ?? rule.label ?? rule.code,
        reading: missing ? "Not entered" : formatAnswer(rule.reading, rule.unit),
        acceptedRangeKey: rule.acceptedRangeKey ?? `AMC_RULE_${rule.code}_RANGE`,
        acceptedRange: rule.acceptedRange ?? "-",
        passed: rule.passed,
      };
    });
}

export function toReportPhotos(visit: RawAmcVisit): AmcReportPhoto[] {
  const documents = visit.visitReport?.documents ?? [];
  const order = (documentType: string) => {
    const index = AMC_PHOTO_TYPES.findIndex((photo) => photo.documentType === documentType);
    return index === -1 ? AMC_PHOTO_TYPES.length : index;
  };
  return documents
    .filter((document): document is { documentType: string; fileStoreId: string } =>
      Boolean(document.documentType && document.fileStoreId),
    )
    .sort((a, b) => order(a.documentType) - order(b.documentType))
    .map((document) => ({
      documentType: document.documentType,
      fileStoreId: document.fileStoreId,
      titleKey: `ES_AMC_PHOTO_${document.documentType}`,
      title: AMC_PHOTO_TYPES.find((photo) => photo.documentType === document.documentType)?.title ?? humanize(document.documentType),
    }));
}

/** A REJECT step's comment is a JSON list of `{ reason, comment }`; anything else is shown as text. */
export function parseReworkComment(comment: string | null | undefined): AmcReworkReason[] | undefined {
  if (!comment) return undefined;
  try {
    const parsed: unknown = JSON.parse(comment);
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .filter((entry): entry is AmcReworkReason => typeof entry?.reason === "string")
      .map((entry) => ({ reason: entry.reason, comment: entry.comment || undefined }));
  } catch {
    return undefined;
  }
}

function toHistoryEntry(step: RawAmcProcessInstance): AmcReportHistoryEntry {
  const reasons = step.action === "REJECT" ? parseReworkComment(step.comment) : undefined;
  return {
    action: step.action ?? "",
    actor: step.assigner?.name ?? "-",
    date: step.auditDetails?.createdTime ?? undefined,
    reasons: (reasons ?? []).map((entry) => ({ code: entry.reason, comment: entry.comment })),
    comment: reasons ? undefined : (step.comment ?? undefined),
  };
}

/** Workflow history, latest first. */
export function toReportHistory(visit: RawAmcVisit): AmcReportHistoryEntry[] {
  return (visit.processInstances ?? [])
    .map(toHistoryEntry)
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
}

function endUserName(visit: RawAmcVisit): string {
  return visit.facility?.facility_name ?? visit.facilityName ?? visit.facilityId ?? "-";
}

function optionalBoolean(value: boolean | null | undefined): boolean | undefined {
  return value === null || value === undefined ? undefined : value;
}

export function toAmcReport(visit: RawAmcVisit): AmcReport {
  const systemStatus = visit.additionalDetails?.systemStatus ?? visit.visitReport?.additionalDetails?.systemStatus;
  const awaitsReview = visit.status === "PENDING_APPROVAL" && typeof visit.slaDaysRemaining === "number";
  return {
    id: visit.id,
    projectId: visit.projectId,
    endUserName: endUserName(visit),
    endUserPhone: visit.facility?.facility_poc_phone ?? "-",
    state: visit.state ?? "-",
    district: visit.district ?? "-",
    block: visit.block ?? "-",
    vendorName: visit.vendorName ?? "-",
    fieldStaffName: visit.fieldStaff?.name ?? "-",
    visitNumber: visit.visitNumber ?? 0,
    totalVisits: visit.totalVisits ?? undefined,
    scheduledDate: visit.scheduledDate ?? undefined,
    firstSubmissionDate: visit.firstSubmissionDate ?? undefined,
    latestSubmissionDate: visit.latestSubmissionDate ?? undefined,
    status: visit.status,
    approvedBy: visit.approvedBy ?? undefined,
    sla: awaitsReview ? { daysRemaining: visit.slaDaysRemaining!, breached: Boolean(visit.slaBreached) } : undefined,
    systemInUse: optionalBoolean(systemStatus?.isSystemInUse),
    systemFunctional: optionalBoolean(systemStatus?.isSystemFunctional),
    ruleResults: toRuleResults(visit),
    sections: toReportSections(visit),
    photos: toReportPhotos(visit),
    history: toReportHistory(visit),
    reportPdfFileStoreId: visit.additionalDetails?.reportPdf?.fileStoreId ?? undefined,
  };
}

export function toAmcProjectSummary(summary: RawAmcProjectSummary): AmcProjectSummary {
  return {
    projectId: summary.projectId,
    projectName: summary.projectName ?? summary.projectNumber ?? summary.projectId,
    states: summary.states ?? [],
    districts: summary.districts ?? [],
    blocks: summary.blocks ?? [],
    pendingCount: summary.pendingCount ?? 0,
    breachedCount: summary.breachedCount ?? 0,
    autoApprovedCount: summary.autoApprovedCount ?? 0,
    reviewerApprovedCount: summary.reviewerApprovedCount ?? 0,
    reworkCount: summary.reworkCount ?? 0,
  };
}
