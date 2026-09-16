import type { ActivityFacilityRow, FacilityEntry } from "../types/facility-review";

export function toFacilityEntry(row: ActivityFacilityRow): FacilityEntry {
  const { activityFacility } = row;
  const boundary = activityFacility.facility?.boundary;

  return {
    entryId: activityFacility.id,
    facilityId: activityFacility.facilityId,
    facilityName: activityFacility.facility?.facility_name ?? "",
    entryType: activityFacility.componentType,
    planId: activityFacility.fieldPlanId,
    status: activityFacility.status,
    district: boundary?.district ? { code: boundary.district } : undefined,
    block: boundary?.block ? { code: boundary.block } : undefined,
  };
}
