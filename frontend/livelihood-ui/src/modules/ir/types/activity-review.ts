import type {
  ActivityBillOfMaterial,
  ActivityStatus,
  ActivityTransaction,
  ActivityWorkflowEntry,
} from "@/shared";
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
// ActivityBomComponent/ActivityBillOfMaterial/ActivityWorkflowEntry/
// ActivityTransaction(Comment) live in @/shared — eu reads the same
// /activity/v1/activities/_search response for the same activity.

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
// Installation-image sections are dynamic (one per MDMS checklist criterion),
// so the overall id space is a plain string rather than a fixed literal union.
// SOLAR_SECTION_IDS/MACHINE_SECTION_IDS (the fixed Panel/Battery/Inverter/
// Machine vocabulary) and LabeledValue, SectionImage, SectionVideo, AssetItem,
// MediaGroup, AssetSectionContent, ReportDocument, ReportSectionContent,
// ImageChecklistSectionContent, ReviewSectionContent, and the lazily-loaded
// SectionMediaPatch family all live in @/shared/@/ui — eu's read-only
// Activity Report page renders the same shared display components over the
// same shapes, built from the same shared asset-mapping/review-sections.
export type ReviewSectionId = string;

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
