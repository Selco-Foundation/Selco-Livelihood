export type FacilityEntryType = "MACHINE" | "SOLAR";

export const FACILITY_ENTRY_STATUS = {
  SUBMITTED_BY_SUPERVISOR: "SUBMITTED_BY_SUPERVISOR",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
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
  state?: { code: string; name?: string };
  district?: { code: string; name?: string };
  block?: { code: string; name?: string };
}

export const REVIEW_SECTION_IDS = ["SPECS", "PHOTOS", "VIDEO", "HANDOVER_LETTER"] as const;
export type ReviewSectionId = (typeof REVIEW_SECTION_IDS)[number];

export interface ReviewSectionDefinition {
  id: ReviewSectionId;
  labelKey: string;
  label: string;
}

export interface ReviewSectionContent extends ReviewSectionDefinition {
  summary: string;
}

export interface FacilityReviewDetail {
  entry: FacilityEntry;
  sections: ReviewSectionContent[];
}

export type SectionRejectionReasons = Partial<Record<ReviewSectionId, string>>;

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
