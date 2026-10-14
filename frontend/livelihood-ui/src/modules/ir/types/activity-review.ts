import type { ActivityStatus } from "@/shared";
import type { ActivityAuditCheckpoint, ActivityDocument, ReviewSectionContent } from "@/ui";

export type ActivityComponentType = "MACHINE" | "SOLAR";

export interface ReviewActivity {
  activityId: string;
  facilityId: string;
  facilityName: string;
  componentType: ActivityComponentType;
  planId: string;
  status: ActivityStatus;
  district?: { code: string; name?: string };
  block?: { code: string; name?: string };
}

// ---- Raw ActivityFacility search DTOs ----
// POST /activity/v1/activities/_search — see services/facility.ts.
// District/block options are NOT sourced from here — they come from the
// shared boundary service (see hooks/use-boundary), seeded by the field
// plan's own state from the ActivityAssignment search (installation-plan.ts)
// which this page already fetches for its breadcrumb/summary.

export interface ActivityBomComponent {
  slNo?: number;
  product?: string;
  capacity?: string;
  category?: string;
  quantity?: number;
}

export interface ActivityBillOfMaterial {
  name?: string;
  reportNumber?: string;
  additionalDetails?: { vendorOrgName?: string; vendorUserName?: string };
  data?: { components?: ActivityBomComponent[]; purchaseOrderNumber?: string };
}

export interface ActivityWorkflowEntry {
  id?: string;
  action?: string;
  comment?: string;
  documents?: ActivityDocument[] | null;
  state?: { applicationStatus?: ActivityStatus };
  assigner?: { name?: string; roles?: Array<{ name?: string }> };
  auditDetails?: { createdTime?: number };
}

export interface ActivityTransactionComment {
  commentMessage?: string;
  assetType?: string;
}

export interface ActivityTransaction {
  processInstanceId?: string;
  comments?: ActivityTransactionComment[];
}

export interface ActivityFacilityRow {
  activityFacility: {
    id: string;
    facilityId: string;
    fieldPlanId: string;
    componentType: ActivityComponentType;
    status: ActivityStatus;
    facility?: {
      facility_name?: string;
      boundary?: { district?: string; block?: string };
    };
    billOfMaterial?: ActivityBillOfMaterial;
  };
  workflow?: ActivityWorkflowEntry[];
  transactions?: ActivityTransaction[];
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

// LabeledValue, SectionImage, SectionVideo, AssetItem, MediaGroup,
// AssetSectionContent, ReportDocument, ReportSectionContent,
// ImageChecklistSectionContent, ReviewSectionContent, and the lazily-loaded
// SectionMediaPatch family all live in @/ui (components/activity-review/
// types.ts) — eu's read-only Activity Report page renders the same shared
// display components over the same shapes. ir's own asset-mapping.ts still
// uses SolarSectionId/MachineSectionId above as the concrete values it
// assigns to @/ui's AssetSectionContent.id (typed there as plain `string`).

// ---- Rejection reasons ----
// Structured per top-level section, matching qc: each entry is a reason
// picked from an MDMS-sourced master plus a free-text comment.
// RejectionReasonOption (the MDMS master's option shape) lives in @/shared —
// eu's audit trail needs it too, to resolve a historical reason code.

export interface RejectionReasonEntry {
  id: string;
  reasonCode: string;
  reasonLabel: string;
  comment: string;
}

export type SectionRejectionReasons = Partial<Record<ReviewSectionId, RejectionReasonEntry[]>>;

// AuditSectionReasons/ActivityAuditCheckpoint (the audit-trail shapes) also
// live in @/ui — see the note above ReviewSectionContent's old location.

export interface ActivityReviewDetail {
  activity: ReviewActivity;
  sections: ReviewSectionContent[];
  auditTrail: ActivityAuditCheckpoint[];
  /** Raw, unresolved documents per section id — the media (images/videos/
   * report files) for a section is only fetched when the section is expanded
   * (see hooks/use-activity-review.ts's useLoadSectionMedia), since an
   * installation report can carry a lot of attachments. */
  sectionDocuments: Partial<Record<ReviewSectionId, ActivityDocument[]>>;
  /** The latest workflow entry's own documents, unfiltered — sent back
   * as-is on the next workflow action (matches qc's `workflowDocuments`). */
  workflowDocuments: ActivityDocument[];
}

// ---- Review decision ----

export type ReviewDecisionAction = "APPROVE" | "REJECT";

export interface SubmitActivityReviewInput {
  activityId: string;
  action: ReviewDecisionAction;
  rejectionReasons?: SectionRejectionReasons;
  documents: ActivityDocument[];
}
