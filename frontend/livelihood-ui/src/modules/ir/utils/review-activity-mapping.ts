import type { ActivityFacilityRow, ReviewActivity } from "../types/activity-review";

export function toReviewActivity(row: ActivityFacilityRow): ReviewActivity {
  const { activityFacility } = row;
  const boundary = activityFacility.facility?.boundary;

  return {
    activityId: activityFacility.id,
    facilityId: activityFacility.facilityId,
    facilityName: activityFacility.facility?.facility_name ?? "",
    componentType: activityFacility.componentType,
    planId: activityFacility.fieldPlanId,
    status: activityFacility.status,
    district: boundary?.district ? { code: boundary.district } : undefined,
    block: boundary?.block ? { code: boundary.block } : undefined,
  };
}
