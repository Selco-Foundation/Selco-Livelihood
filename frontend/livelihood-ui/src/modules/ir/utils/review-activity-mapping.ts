import type { ActivityFacilityRow, ReviewActivity } from "../types/activity-review";

export function toReviewActivity(row: ActivityFacilityRow): ReviewActivity {
  const { activityFacility } = row;
  const boundary = activityFacility.facility?.boundary;

  return {
    activityId: activityFacility.id,
    facilityId: activityFacility.facilityId,
    facilityName: activityFacility.facility?.facility_name ?? "",
    // A machine's BOM name is its product name. A solar system's is just the stored English
    // word "Solar", which the table localizes itself, so it isn't passed on.
    assetName: activityFacility.componentType === "MACHINE" ? activityFacility.billOfMaterial?.name : undefined,
    componentType: activityFacility.componentType,
    planId: activityFacility.fieldPlanId,
    status: activityFacility.status,
    district: boundary?.district ? { code: boundary.district } : undefined,
    block: boundary?.block ? { code: boundary.block } : undefined,
  };
}
