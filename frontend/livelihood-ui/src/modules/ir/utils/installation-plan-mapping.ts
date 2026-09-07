import { formatEpochDate } from "./date-format";
import type { ActivityAssignment, InstallationPlan } from "../types/installation-plan";

// Facility-level statuses as rolled up by the activity-assignment API's own
// `statusAgregation` — these are the real `FACILITY_INSTALLATION` business
// service states (see types/facility-review.ts's FACILITY_ENTRY_STATUS).
const STATUS_APPROVED = "APPROVED_BY_QC_SPOC";
const STATUS_PENDING_REVIEW = "SUBMITTED_BY_FIELD_STAFF";

export function toInstallationPlan(row: ActivityAssignment): InstallationPlan {
  const totalFacilities = row.additionalDetails?.countFieldPlanFacilities ?? 0;
  const statusCounts = new Map(
    (row.additionalDetails?.statusAgregation ?? []).map((entry) => [entry.status, entry.occurrences]),
  );
  const approvedCount = statusCounts.get(STATUS_APPROVED) ?? 0;
  // `occurrences` appears to count status *transitions* over a facility's history
  // (e.g. rejected then re-approved counts twice), not distinct current facilities,
  // so it can exceed `totalFacilities` — clamp, since >100% is never a valid display.
  const completionRate =
    totalFacilities > 0 ? Math.min(100, Math.ceil((approvedCount / totalFacilities) * 100)) : 0;

  return {
    planId: row.fieldPlanId,
    planName: row.fieldPlan?.name ?? "",
    tenantId: row.tenantId,
    totalFacilities,
    startDate: formatEpochDate(row.startDate),
    endDate: formatEpochDate(row.endDate),
    pendingReviewCount: statusCounts.get(STATUS_PENDING_REVIEW) ?? 0,
    completionRate,
    stateCode: row.fieldPlan?.geographyDetails?.state,
  };
}
