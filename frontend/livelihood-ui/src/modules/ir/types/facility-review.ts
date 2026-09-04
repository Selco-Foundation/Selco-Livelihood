export type FacilityEntryType = "MACHINE" | "SOLAR";

// Real states of the `FACILITY_INSTALLATION` business service
// (business `field-planner-activity`): SCHEDULED -> ASSIGNED_TO_FIELD_STAFF ->
// SUBMITTED_BY_FIELD_STAFF -> {APPROVED_BY_QC_SPOC | REJECTED_BY_QC_SPOC},
// with REJECTED_BY_QC_SPOC looping back to SUBMITTED_BY_FIELD_STAFF.
export const FACILITY_ENTRY_STATUS = {
  SCHEDULED: "SCHEDULED",
  ASSIGNED_TO_FIELD_STAFF: "ASSIGNED_TO_FIELD_STAFF",
  SUBMITTED_BY_FIELD_STAFF: "SUBMITTED_BY_FIELD_STAFF",
  APPROVED_BY_QC_SPOC: "APPROVED_BY_QC_SPOC",
  REJECTED_BY_QC_SPOC: "REJECTED_BY_QC_SPOC",
} as const;

export type FacilityEntryStatus =
  (typeof FACILITY_ENTRY_STATUS)[keyof typeof FACILITY_ENTRY_STATUS];

export interface FacilityEntry {
  entryId: string;
  facilityId: string;
  facilityName: string;
  entryType: FacilityEntryType;
  planId: string;
  status: FacilityEntryStatus;
  district?: { code: string; name?: string };
  block?: { code: string; name?: string };
}

// ---- Raw ActivityFacility search DTOs ----
// POST /activity/v1/activities/_search — see services/facility.ts.
// District/block options are NOT sourced from here — they come from the
// shared boundary service (see hooks/use-boundary), seeded by the field
// plan's own state from the ActivityAssignment search (installation-plan.ts)
// which this page already fetches for its breadcrumb/summary.

export interface ActivityFacilityRow {
  activityFacility: {
    id: string;
    facilityId: string;
    fieldPlanId: string;
    componentType: FacilityEntryType;
    status: FacilityEntryStatus;
    facility?: {
      facility_name?: string;
      boundary?: { district?: string; block?: string };
    };
  };
}

export interface ActivityFacilitySearchResponse {
  totalCount?: number;
  facility?: ActivityFacilityRow[];
}

// ---- Review sections ----
// SOLAR mirrors qc's per-asset-type structure exactly: Panel/Battery/Inverter,
// each independently reviewable, plus a separate Installation Completion
// Report section. MACHINE has no separate report section — its one "Machine"
// section IS the whole report, with the machine's media fields (Electric
// Board / Demo Test / Photo with End User) as labeled sub-groups inside it,
// per the mockup.
export const SOLAR_SECTION_IDS = [
  "PANEL",
  "BATTERY",
  "INVERTER",
  "INSTALLATION_COMPLETION_REPORT",
] as const;
export const MACHINE_SECTION_IDS = ["MACHINE"] as const;

export type SolarSectionId = (typeof SOLAR_SECTION_IDS)[number];
export type MachineSectionId = (typeof MACHINE_SECTION_IDS)[number];
// Installation-image sections are dynamic (one per MDMS checklist criterion),
// so the overall id space is a plain string rather than a fixed literal union.
export type ReviewSectionId = string;

export interface LabeledValue {
  labelKey: string;
  label: string;
  value: string;
}

export interface SectionImage {
  url: string;
}

export interface SectionVideo {
  url: string;
  size?: number;
}

/** One physical unit within an asset section — e.g. "Panel 1", "Panel 2". */
export interface AssetItem {
  itemNumber: number;
  serialNumber?: string;
  capacity?: string;
  images: SectionImage[];
}

/** A labeled media sub-group within a section — used by Machine's Electric
 * Board / Demo Test with Raw Material / Photo with End User fields, which
 * need their own titles rather than sitting in one anonymous gallery. */
export interface MediaGroup {
  id: string;
  labelKey: string;
  label: string;
  images: SectionImage[];
  videos: SectionVideo[];
}

export interface AssetSectionContent {
  kind: "ASSET";
  id: SolarSectionId | MachineSectionId;
  labelKey: string;
  label: string;
  count?: number;
  specifications: LabeledValue[];
  /** Battery-only, matching qc's one hardcoded special case: an extra titled
   * sub-block (Capacity/Voltage) alongside the regular specifications. */
  extraSpecifications?: { labelKey: string; label: string; fields: LabeledValue[] };
  details?: LabeledValue[];
  items?: AssetItem[];
  images: SectionImage[];
  videos: SectionVideo[];
  mediaGroups?: MediaGroup[];
}

export interface ReportDocument {
  name: string;
  url: string;
  size?: number;
}

export interface ReportSectionContent {
  kind: "REPORT";
  id: "INSTALLATION_COMPLETION_REPORT";
  labelKey: string;
  label: string;
  installationCompletionCertificate: ReportDocument | null;
  assetHandoverDocument: ReportDocument | null;
  supportingDocuments: ReportDocument[];
}

/** One installation-image checklist entry (e.g. "Site overview photo"),
 * rendered as its own top-level section — sibling to Panel/Battery/Inverter,
 * not nested inside the report section. */
export interface ImageChecklistSectionContent {
  kind: "IMAGE_CHECKLIST";
  id: string;
  label: string;
  images: SectionImage[];
}

export type ReviewSectionContent =
  | AssetSectionContent
  | ReportSectionContent
  | ImageChecklistSectionContent;

// ---- Rejection reasons ----
// Structured per top-level section, matching qc: each entry is a reason
// picked from an MDMS-sourced master plus a free-text comment.

export interface RejectionReasonOption {
  code: string;
  name: string;
}

export interface RejectionReasonEntry {
  id: string;
  reasonCode: string;
  reasonLabel: string;
  comment: string;
}

export type SectionRejectionReasons = Partial<Record<ReviewSectionId, RejectionReasonEntry[]>>;

// ---- Audit trail ----

export interface AuditSectionReasons {
  sectionId: ReviewSectionId;
  sectionLabel: string;
  reasons: { reasonLabel: string; comment: string }[];
}

export interface FacilityAuditCheckpoint {
  id: string;
  status: FacilityEntryStatus;
  date: string;
  sectionReasons?: AuditSectionReasons[];
}

export interface FacilityReviewDetail {
  entry: FacilityEntry;
  sections: ReviewSectionContent[];
  auditTrail: FacilityAuditCheckpoint[];
}

// ---- Review decision ----

export type ReviewDecisionAction = "APPROVE" | "REJECT";

export interface SubmitFacilityReviewInput {
  entryId: string;
  action: ReviewDecisionAction;
  rejectionReasons?: SectionRejectionReasons;
}

export interface SubmitFacilityReviewResponse {
  entryId: string;
  status: FacilityEntryStatus;
}
