import { describe, expect, it } from "vitest";
import type { ActivityAssignment } from "../types/installation-plan";
import { toInstallationPlan } from "./installation-plan-mapping";

function assignment(overrides: Partial<ActivityAssignment> = {}): ActivityAssignment {
  return {
    id: "assignment-1",
    tenantId: "tenant-1",
    fieldPlanId: "plan-1",
    fieldPlan: {
      id: "plan-1",
      name: "Plan One",
      geographyDetails: { states: ["STATE_1"], districts: ["DISTRICT_1"], blocks: ["BLOCK_1"] },
    },
    startDate: new Date(2026, 0, 1).getTime(),
    endDate: new Date(2026, 2, 1).getTime(),
    additionalDetails: {
      countFieldPlanFacilities: 10,
      statusAgregation: [
        { status: "APPROVED_BY_QC_SPOC", occurrences: 4 },
        { status: "SUBMITTED_BY_FIELD_STAFF", occurrences: 3 },
      ],
    },
    ...overrides,
  };
}

describe("toInstallationPlan", () => {
  it("maps a fully populated assignment", () => {
    expect(toInstallationPlan(assignment())).toEqual({
      planId: "plan-1",
      planName: "Plan One",
      tenantId: "tenant-1",
      totalFacilities: 10,
      startDate: "01/01/2026",
      endDate: "03/01/2026",
      pendingReviewCount: 3,
      completionRate: 40,
      stateCodes: ["STATE_1"],
      districtCodes: ["DISTRICT_1"],
      blockCodes: ["BLOCK_1"],
    });
  });

  it("clamps completion rate at 100 when occurrences exceed total facilities", () => {
    const result = toInstallationPlan(
      assignment({
        additionalDetails: {
          countFieldPlanFacilities: 5,
          statusAgregation: [{ status: "APPROVED_BY_QC_SPOC", occurrences: 9 }],
        },
      }),
    );
    expect(result.completionRate).toBe(100);
  });

  it("rounds completion rate up to the nearest integer", () => {
    const result = toInstallationPlan(
      assignment({
        additionalDetails: {
          countFieldPlanFacilities: 3,
          statusAgregation: [{ status: "APPROVED_BY_QC_SPOC", occurrences: 1 }],
        },
      }),
    );
    expect(result.completionRate).toBe(34);
  });

  it("defaults completion rate to 0 when totalFacilities is 0", () => {
    const result = toInstallationPlan(assignment({ additionalDetails: { countFieldPlanFacilities: 0 } }));
    expect(result.completionRate).toBe(0);
  });

  it("defaults totalFacilities, pendingReviewCount and completionRate when additionalDetails is missing", () => {
    const result = toInstallationPlan(assignment({ additionalDetails: undefined }));
    expect(result.totalFacilities).toBe(0);
    expect(result.pendingReviewCount).toBe(0);
    expect(result.completionRate).toBe(0);
  });

  it("defaults geography codes to empty arrays when geographyDetails is missing", () => {
    const result = toInstallationPlan(
      assignment({ fieldPlan: { id: "plan-1", name: "Plan One" } }),
    );
    expect(result.stateCodes).toEqual([]);
    expect(result.districtCodes).toEqual([]);
    expect(result.blockCodes).toEqual([]);
  });

  it("defaults planName to an empty string when fieldPlan.name is missing", () => {
    const result = toInstallationPlan(
      assignment({ fieldPlan: { id: "plan-1", name: undefined as unknown as string } }),
    );
    expect(result.planName).toBe("");
  });
});
