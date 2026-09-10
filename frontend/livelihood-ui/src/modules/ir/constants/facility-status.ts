import type { FacilityEntryStatus } from "../types/facility-review";

export const FACILITY_INSTALLATION_BUSINESS_SERVICE = "FACILITY_INSTALLATION";

interface StatusLabel {
  key: string;
  fallback: string;
}

// Fixed display order for status filter options and any listing of "all
// known statuses" — independent of whatever order the business service
// returns its states in.
export const FACILITY_ENTRY_STATUS_ORDER: FacilityEntryStatus[] = [
  "SCHEDULED",
  "ASSIGNED_TO_FIELD_STAFF",
  "SUBMITTED_BY_FIELD_STAFF",
  "REJECTED_BY_QC_SPOC",
  "APPROVED_BY_QC_SPOC",
];

export const FACILITY_ENTRY_STATUS_LABELS: Record<FacilityEntryStatus, StatusLabel> = {
  SCHEDULED: { key: "ES_IR_STATUS_SCHEDULED", fallback: "Scheduled" },
  ASSIGNED_TO_FIELD_STAFF: { key: "ES_IR_STATUS_ASSIGNED", fallback: "Assigned" },
  SUBMITTED_BY_FIELD_STAFF: { key: "ES_IR_STATUS_PENDING", fallback: "Pending Review" },
  REJECTED_BY_QC_SPOC: { key: "ES_IR_STATUS_REJECTED", fallback: "Rejected" },
  APPROVED_BY_QC_SPOC: { key: "ES_IR_STATUS_APPROVED", fallback: "Approved" },
};

export type FacilityStatusBadgeVariant = "neutral" | "pending" | "rejected" | "approved";

export function facilityStatusBadgeVariant(
  status: FacilityEntryStatus,
): FacilityStatusBadgeVariant {
  switch (status) {
    case "SUBMITTED_BY_FIELD_STAFF":
      return "pending";
    case "REJECTED_BY_QC_SPOC":
      return "rejected";
    case "APPROVED_BY_QC_SPOC":
      return "approved";
    default:
      return "neutral";
  }
}
