import { describe, expect, it } from "vitest";
import type { InstallationImageCriterion, MachineAssetData } from "@/shared";
import type { AssetSectionContent } from "@/ui";
import { buildActivityReviewDetail } from "./activity-review-mapping";
import type { ActivityFacilityRow } from "../types/activity-review";

// The deep mapping logic (section assembly, machine/report sections,
// audit trail, section-document bucketing) is tested once, directly,
// in @/shared's activity-workflow-mapping.test.ts — eu's orchestrator
// exercises the exact same shared functions. These tests cover only what's
// actually specific to ir's own wrapping: `activity` (via toReviewActivity)
// and `workflowDocuments` (eu's ActivityDetail has neither).

const emptyMachineAssetData: MachineAssetData = { details: undefined, items: [], mediaGroups: [] };

function row(overrides: Partial<ActivityFacilityRow["activityFacility"]> = {}): ActivityFacilityRow {
  return {
    activityFacility: {
      id: "act-1",
      facilityId: "fac-1",
      fieldPlanId: "plan-1",
      componentType: "SOLAR",
      status: "SUBMITTED_BY_FIELD_STAFF",
      facility: { facility_name: "Facility A", boundary: { district: "D1", block: "B1" } },
      ...overrides,
    },
  };
}

const panelSection: AssetSectionContent = {
  kind: "ASSET",
  id: "PANEL",
  labelKey: "ES_IR_SECTION_PANEL",
  label: "Panel",
  specifications: [],
  details: [],
  items: [],
  images: [],
  videos: [],
};

describe("buildActivityReviewDetail — activity", () => {
  it("derives the review activity from the row via toReviewActivity", () => {
    const result = buildActivityReviewDetail(row(), [], [], [], emptyMachineAssetData);
    expect(result.activity).toEqual({
      activityId: "act-1",
      facilityId: "fac-1",
      facilityName: "Facility A",
      componentType: "SOLAR",
      planId: "plan-1",
      status: "SUBMITTED_BY_FIELD_STAFF",
      district: { code: "D1" },
      block: { code: "B1" },
    });
  });
});

describe("buildActivityReviewDetail — workflowDocuments", () => {
  it("carries the latest workflow entry's own documents through unfiltered", () => {
    const criteria: InstallationImageCriterion[] = [];
    const documents = [
      { documentType: "PANEL-IMAGE-FRONT", fileStoreId: "1" },
      { documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "2" },
    ];
    const result = buildActivityReviewDetail(
      { ...row(), workflow: [{ documents }] },
      criteria,
      [panelSection],
      [],
      emptyMachineAssetData,
    );
    expect(result.workflowDocuments).toEqual(documents);
  });

  it("defaults to an empty array when there is no workflow", () => {
    const result = buildActivityReviewDetail(row(), [], [panelSection], [], emptyMachineAssetData);
    expect(result.workflowDocuments).toEqual([]);
  });
});

describe("buildActivityReviewDetail — wiring", () => {
  it("passes the component type and asset data through to the shared section builder", () => {
    const result = buildActivityReviewDetail(row(), [], [panelSection], [], emptyMachineAssetData);
    expect(result.sections[0]).toBe(panelSection);
  });

  it("builds a Machine section instead of using solarAssetSections for a machine activity", () => {
    const result = buildActivityReviewDetail(
      row({ componentType: "MACHINE" }),
      [],
      [panelSection],
      [],
      emptyMachineAssetData,
    );
    expect(result.sections.some((s) => s.id === "PANEL")).toBe(false);
    expect(result.sections.some((s) => s.id === "MACHINE")).toBe(true);
  });

  it("buckets sectionDocuments by the assembled sections", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ documents: [{ documentType: "PANEL-IMAGE-FRONT", fileStoreId: "1" }] }],
      },
      [],
      [panelSection],
      [],
      emptyMachineAssetData,
    );
    expect(result.sectionDocuments.PANEL).toEqual([{ documentType: "PANEL-IMAGE-FRONT", fileStoreId: "1" }]);
  });

  it("resolves the audit trail through the shared builder, including rejection reasons", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ id: "wf-1" }],
        transactions: [
          {
            processInstanceId: "wf-1",
            comments: [{ assetType: "PANEL", commentMessage: JSON.stringify({ comment: "cracked" }) }],
          },
        ],
      },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.auditTrail[0].sectionReasons).toEqual([
      { sectionId: "PANEL", sectionLabel: "Panel", reasons: [{ reasonLabel: "PANEL", comment: "cracked" }] },
    ]);
  });
});
