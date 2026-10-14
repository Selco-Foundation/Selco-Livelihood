import { describe, expect, it } from "vitest";
import type { MachineAssetData } from "@/shared";
import type { AssetSectionContent } from "@/ui";
import { buildActivityDetail, buildActivityInfo } from "./activity-detail-mapping";
import type { ActivityFacilityRow } from "../services/activity-detail";

// The deep mapping logic (section assembly, machine/report sections, audit
// trail, section-document bucketing) is tested once, directly, in
// @/shared's activity-workflow-mapping.test.ts — this orchestrator calls
// the exact same shared functions ir's does. These tests cover only what's
// actually specific to eu's own wrapping: `info`/`facilityName` (ir's
// ReviewActivity carries neither this way) and that the shared builders are
// wired in correctly.

const emptyMachineAssetData: MachineAssetData = { details: undefined, items: [], mediaGroups: [] };

function row(overrides: Partial<NonNullable<ActivityFacilityRow["activityFacility"]>> = {}): ActivityFacilityRow {
  return {
    activityFacility: {
      id: "act-1",
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

describe("buildActivityInfo", () => {
  it("derives the info card fields from the row's district/block/componentType/status", () => {
    expect(buildActivityInfo(row())).toEqual({
      componentType: "SOLAR",
      status: "SUBMITTED_BY_FIELD_STAFF",
      district: { code: "D1" },
      block: { code: "B1" },
    });
  });

  it("defaults componentType to SOLAR and status to SCHEDULED when missing", () => {
    const info = buildActivityInfo({ activityFacility: { id: "act-1" } });
    expect(info.componentType).toBe("SOLAR");
    expect(info.status).toBe("SCHEDULED");
  });

  it("leaves district and block undefined when the facility has no boundary", () => {
    const info = buildActivityInfo({ activityFacility: { id: "act-1", facility: { facility_name: "Facility A" } } });
    expect(info.district).toBeUndefined();
    expect(info.block).toBeUndefined();
  });
});

describe("buildActivityDetail — facilityName", () => {
  it("carries the facility's own name through separately from the info card fields", () => {
    const result = buildActivityDetail(row(), [], [], [], emptyMachineAssetData);
    expect(result.facilityName).toBe("Facility A");
  });

  it("leaves facilityName undefined when the row has no facility", () => {
    const result = buildActivityDetail(
      { activityFacility: { id: "act-1" } },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.facilityName).toBeUndefined();
  });
});

describe("buildActivityDetail — wiring", () => {
  it("uses buildActivityInfo for the info field", () => {
    const result = buildActivityDetail(row(), [], [], [], emptyMachineAssetData);
    expect(result.info).toEqual(buildActivityInfo(row()));
  });

  it("passes the component type and asset data through to the shared section builder", () => {
    const result = buildActivityDetail(row(), [], [panelSection], [], emptyMachineAssetData);
    expect(result.sections[0]).toBe(panelSection);
  });

  it("builds a Machine section instead of using solarAssetSections for a machine activity", () => {
    const result = buildActivityDetail(
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
    const result = buildActivityDetail(
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
    const result = buildActivityDetail(
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
