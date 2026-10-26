import { describe, expect, it } from "vitest";
import type { ActivityFacilityRow } from "../types/activity-review";
import { toReviewActivity } from "./review-activity-mapping";

function row(overrides: Partial<ActivityFacilityRow["activityFacility"]> = {}): ActivityFacilityRow {
  return {
    activityFacility: {
      id: "activity-1",
      facilityId: "facility-1",
      fieldPlanId: "plan-1",
      componentType: "SOLAR",
      status: "SUBMITTED_BY_FIELD_STAFF",
      facility: {
        facility_name: "Facility One",
        boundary: { district: "DISTRICT_1", block: "BLOCK_1" },
      },
      billOfMaterial: { name: "Oil Mill-Cold Press-3-HP-AC-20-kgs/hr" },
      ...overrides,
    },
  };
}

describe("toReviewActivity", () => {
  it("maps every field from a fully populated row", () => {
    expect(toReviewActivity(row({ componentType: "MACHINE" }))).toEqual({
      activityId: "activity-1",
      facilityId: "facility-1",
      facilityName: "Facility One",
      assetName: "Oil Mill-Cold Press-3-HP-AC-20-kgs/hr",
      componentType: "MACHINE",
      planId: "plan-1",
      status: "SUBMITTED_BY_FIELD_STAFF",
      district: { code: "DISTRICT_1" },
      block: { code: "BLOCK_1" },
    });
  });

  it("defaults facilityName to an empty string when facility is missing", () => {
    expect(toReviewActivity(row({ facility: undefined })).facilityName).toBe("");
  });

  it("leaves assetName undefined when a machine has no bill of material", () => {
    expect(toReviewActivity(row({ componentType: "MACHINE", billOfMaterial: undefined })).assetName).toBeUndefined();
  });

  it("does not pass on the bill of material name for a solar activity", () => {
    expect(toReviewActivity(row({ componentType: "SOLAR" })).assetName).toBeUndefined();
  });

  it("leaves district/block undefined when boundary is missing", () => {
    const result = toReviewActivity(
      row({ facility: { facility_name: "Facility One", boundary: undefined } }),
    );
    expect(result.district).toBeUndefined();
    expect(result.block).toBeUndefined();
  });

  it("leaves district undefined when boundary.district is missing but block is present", () => {
    const result = toReviewActivity(
      row({ facility: { facility_name: "Facility One", boundary: { block: "BLOCK_1" } } }),
    );
    expect(result.district).toBeUndefined();
    expect(result.block).toEqual({ code: "BLOCK_1" });
  });
});
