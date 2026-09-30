import { describe, expect, it } from "vitest";
import type { MachineAssetData } from "./asset-mapping";
import type { InstallationImageCriterion } from "./installation-image-mapping";
import { buildActivityReviewDetail, humanize } from "./activity-review-mapping";
import type {
  ActivityFacilityRow,
  AssetSectionContent,
  RejectionReasonOption,
} from "../types/activity-review";

describe("humanize", () => {
  it("replaces underscores with spaces and title-cases each word", () => {
    expect(humanize("SOME_CODE")).toBe("Some Code");
  });

  it("title-cases a single word", () => {
    expect(humanize("OTHER")).toBe("Other");
  });

  it("lower-cases an already-uppercase multi-word code", () => {
    expect(humanize("DAMAGED_IN_TRANSIT")).toBe("Damaged In Transit");
  });

  it("returns an empty string for an empty input", () => {
    expect(humanize("")).toBe("");
  });
});

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

describe("buildActivityReviewDetail — section assembly", () => {
  it("appends the report section and every image-checklist criterion for a solar activity", () => {
    const criteria: InstallationImageCriterion[] = [
      { code: "SITE_OVERVIEW", description: "Site overview photo" },
    ];
    const result = buildActivityReviewDetail(row(), criteria, [panelSection], [], emptyMachineAssetData);

    expect(result.sections.map((s) => s.id)).toEqual([
      "PANEL",
      "INSTALLATION_COMPLETION_REPORT",
      "INSTALLATION_IMAGE_SITE_OVERVIEW",
    ]);
    expect(result.sections[0]).toBe(panelSection);
  });

  it("labels each image-checklist section from its criterion's description", () => {
    const criteria: InstallationImageCriterion[] = [
      { code: "NAMEPLATE", description: "Nameplate photo" },
    ];
    const result = buildActivityReviewDetail(row(), criteria, [], [], emptyMachineAssetData);
    const checklistSection = result.sections.find((s) => s.id === "INSTALLATION_IMAGE_NAMEPLATE");
    expect(checklistSection).toMatchObject({ kind: "IMAGE_CHECKLIST", label: "Nameplate photo" });
  });

  it("does not append image-checklist sections for a machine activity", () => {
    const criteria: InstallationImageCriterion[] = [
      { code: "SITE_OVERVIEW", description: "Site overview photo" },
    ];
    const result = buildActivityReviewDetail(
      row({ componentType: "MACHINE" }),
      criteria,
      [panelSection],
      [],
      emptyMachineAssetData,
    );
    expect(result.sections.map((s) => s.id)).toEqual(["MACHINE", "INSTALLATION_COMPLETION_REPORT"]);
  });

  it("ignores solarAssetSections entirely for a machine activity", () => {
    const result = buildActivityReviewDetail(
      row({ componentType: "MACHINE" }),
      [],
      [panelSection],
      [],
      emptyMachineAssetData,
    );
    expect(result.sections.some((s) => s.id === "PANEL")).toBe(false);
  });
});

describe("buildActivityReviewDetail — machine section", () => {
  it("includes only the vendor/installedBy/reportNumber specifications actually present on the BOM", () => {
    const result = buildActivityReviewDetail(
      row({
        componentType: "MACHINE",
        billOfMaterial: {
          reportNumber: "RPT-1",
          additionalDetails: { vendorOrgName: "Acme Vendor" },
        },
      }),
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    const machineSection = result.sections.find((s) => s.id === "MACHINE");
    expect(machineSection?.kind).toBe("ASSET");
    expect(machineSection).toMatchObject({
      specifications: [
        { labelKey: "ES_IR_MACHINE_VENDOR_ORG", label: "Vendor", value: "Acme Vendor" },
        { labelKey: "ES_IR_MACHINE_REPORT_NUMBER", label: "Report Number", value: "RPT-1" },
      ],
    });
  });

  it("falls back to BOM components as items when the machine has no registered asset items yet", () => {
    const result = buildActivityReviewDetail(
      row({
        componentType: "MACHINE",
        billOfMaterial: {
          data: { components: [{ slNo: 1, product: "Motor", capacity: "3 HP", quantity: 2 }] },
        },
      }),
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    const machineSection = result.sections.find((s) => s.id === "MACHINE");
    expect(machineSection && "items" in machineSection ? machineSection.items : undefined).toEqual([
      { itemNumber: 1, label: "Motor", capacity: "3 HP", quantity: 2, images: [] },
    ]);
  });

  it("prefers real registered asset items over BOM components once available", () => {
    const machineAssetData: MachineAssetData = {
      details: undefined,
      items: [{ itemNumber: 1, label: "Registered Motor", images: [] }],
      mediaGroups: [],
    };
    const result = buildActivityReviewDetail(
      row({
        componentType: "MACHINE",
        billOfMaterial: { data: { components: [{ product: "BOM Motor" }] } },
      }),
      [],
      [],
      [],
      machineAssetData,
    );
    const machineSection = result.sections.find((s) => s.id === "MACHINE");
    expect(machineSection && "items" in machineSection ? machineSection.items : undefined).toEqual([
      { itemNumber: 1, label: "Registered Motor", images: [] },
    ]);
  });

  it("numbers fallback BOM-component items from their index when slNo is missing", () => {
    const result = buildActivityReviewDetail(
      row({
        componentType: "MACHINE",
        billOfMaterial: { data: { components: [{ product: "A" }, { product: "B" }] } },
      }),
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    const machineSection = result.sections.find((s) => s.id === "MACHINE");
    const items = machineSection && "items" in machineSection ? machineSection.items : undefined;
    expect(items?.map((item) => item.itemNumber)).toEqual([1, 2]);
  });
});

describe("buildActivityReviewDetail — report section", () => {
  it("includes the purchase order number spec when present on the BOM", () => {
    const result = buildActivityReviewDetail(
      row({ billOfMaterial: { data: { purchaseOrderNumber: "PO-1" } } }),
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    const reportSection = result.sections.find((s) => s.kind === "REPORT");
    expect(reportSection?.specifications).toEqual([
      { labelKey: "ES_IR_PURCHASE_ORDER_NUMBER", label: "Purchase Order Number", value: "PO-1" },
    ]);
  });

  it("has no specifications when the BOM has no purchase order number", () => {
    const result = buildActivityReviewDetail(row(), [], [], [], emptyMachineAssetData);
    const reportSection = result.sections.find((s) => s.kind === "REPORT");
    expect(reportSection?.specifications).toEqual([]);
  });
});

describe("buildActivityReviewDetail — sectionDocuments and workflowDocuments", () => {
  it("distributes the latest workflow's documents into their matching section by classified key", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [
          {
            documents: [
              { documentType: "PANEL-IMAGE-FRONT", fileStoreId: "1" },
              { documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "2" },
              { documentType: "INSTALLATION_IMAGE-SITE_OVERVIEW", fileStoreId: "3" },
            ],
          },
        ],
      },
      [{ code: "SITE_OVERVIEW", description: "Site overview photo" }],
      [panelSection],
      [],
      emptyMachineAssetData,
    );

    expect(result.sectionDocuments.PANEL).toEqual([{ documentType: "PANEL-IMAGE-FRONT", fileStoreId: "1" }]);
    expect(result.sectionDocuments.INSTALLATION_COMPLETION_REPORT).toEqual([
      { documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "2" },
    ]);
    expect(result.sectionDocuments.INSTALLATION_IMAGE_SITE_OVERVIEW).toEqual([
      { documentType: "INSTALLATION_IMAGE-SITE_OVERVIEW", fileStoreId: "3" },
    ]);
    expect(result.workflowDocuments).toEqual([
      { documentType: "PANEL-IMAGE-FRONT", fileStoreId: "1" },
      { documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "2" },
      { documentType: "INSTALLATION_IMAGE-SITE_OVERVIEW", fileStoreId: "3" },
    ]);
  });

  it("uppercases an installation-image criterion code before matching its document suffix", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ documents: [{ documentType: "INSTALLATION_IMAGE-earthing", fileStoreId: "1" }] }],
      },
      [{ code: "earthing", description: "Earthing photo" }],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.sectionDocuments.INSTALLATION_IMAGE_earthing).toEqual([
      { documentType: "INSTALLATION_IMAGE-earthing", fileStoreId: "1" },
    ]);
  });

  it("defaults sectionDocuments to empty arrays and workflowDocuments to [] when there is no workflow", () => {
    const result = buildActivityReviewDetail(row(), [], [panelSection], [], emptyMachineAssetData);
    expect(result.sectionDocuments.PANEL).toEqual([]);
    expect(result.workflowDocuments).toEqual([]);
  });
});

describe("buildActivityReviewDetail — audit trail", () => {
  it("maps each workflow entry to a checkpoint, defaulting status and date when missing", () => {
    const result = buildActivityReviewDetail(
      { ...row(), workflow: [{ comment: "looks good", assigner: { name: "Reviewer One" } }] },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.auditTrail).toEqual([
      {
        id: "checkpoint-0",
        status: "SCHEDULED",
        date: "-",
        actorName: "Reviewer One",
        comment: "looks good",
        sectionReasons: undefined,
      },
    ]);
  });

  it("formats the checkpoint date from auditDetails.createdTime and uses the entry's own id", () => {
    const createdTime = new Date(2026, 8, 11).getTime();
    const result = buildActivityReviewDetail(
      { ...row(), workflow: [{ id: "wf-1", auditDetails: { createdTime } }] },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.auditTrail[0].id).toBe("wf-1");
    expect(result.auditTrail[0].date).toBe("09/11/2026");
  });

  it("resolves a rejection reason code to its name from the reason options, grouped by assetType", () => {
    const reasonOptions: RejectionReasonOption[] = [{ code: "DAMAGED", name: "Damaged Goods" }];
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ id: "wf-1" }],
        transactions: [
          {
            processInstanceId: "wf-1",
            comments: [
              {
                assetType: "PANEL",
                commentMessage: JSON.stringify({ reasonCode: "DAMAGED", comment: "cracked panel" }),
              },
            ],
          },
        ],
      },
      [],
      [],
      reasonOptions,
      emptyMachineAssetData,
    );
    expect(result.auditTrail[0].sectionReasons).toEqual([
      {
        sectionId: "PANEL",
        sectionLabel: "Panel",
        reasons: [{ reasonLabel: "Damaged Goods", comment: "cracked panel" }],
      },
    ]);
  });

  it("falls back to a humanized reason code when it isn't found in the reason options", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ id: "wf-1" }],
        transactions: [
          {
            processInstanceId: "wf-1",
            comments: [
              {
                assetType: "PANEL",
                commentMessage: JSON.stringify({ reasonCode: "NOT_LISTED", comment: "" }),
              },
            ],
          },
        ],
      },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.auditTrail[0].sectionReasons?.[0].reasons[0].reasonLabel).toBe("Not Listed");
  });

  it("defaults the section id to OTHER when a comment has no assetType", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ id: "wf-1" }],
        transactions: [
          {
            processInstanceId: "wf-1",
            comments: [{ commentMessage: JSON.stringify({ comment: "generic issue" }) }],
          },
        ],
      },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.auditTrail[0].sectionReasons).toEqual([
      { sectionId: "OTHER", sectionLabel: "Other", reasons: [{ reasonLabel: "OTHER", comment: "generic issue" }] },
    ]);
  });

  it("treats a non-JSON commentMessage as plain comment text", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ id: "wf-1" }],
        transactions: [
          {
            processInstanceId: "wf-1",
            comments: [{ assetType: "PANEL", commentMessage: "not json" }],
          },
        ],
      },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.auditTrail[0].sectionReasons).toEqual([
      { sectionId: "PANEL", sectionLabel: "Panel", reasons: [{ reasonLabel: "PANEL", comment: "not json" }] },
    ]);
  });

  it("groups multiple comments for the same section into one entry's reasons list", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ id: "wf-1" }],
        transactions: [
          {
            processInstanceId: "wf-1",
            comments: [
              { assetType: "PANEL", commentMessage: JSON.stringify({ comment: "issue 1" }) },
              { assetType: "PANEL", commentMessage: JSON.stringify({ comment: "issue 2" }) },
            ],
          },
        ],
      },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.auditTrail[0].sectionReasons).toHaveLength(1);
    expect(result.auditTrail[0].sectionReasons?.[0].reasons).toEqual([
      { reasonLabel: "PANEL", comment: "issue 1" },
      { reasonLabel: "PANEL", comment: "issue 2" },
    ]);
  });

  it("leaves sectionReasons undefined when the matching transaction has no comments", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ id: "wf-1" }],
        transactions: [{ processInstanceId: "wf-1", comments: [] }],
      },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.auditTrail[0].sectionReasons).toBeUndefined();
  });

  it("leaves sectionReasons undefined when no transaction matches the entry's id", () => {
    const result = buildActivityReviewDetail(
      {
        ...row(),
        workflow: [{ id: "wf-1" }],
        transactions: [{ processInstanceId: "wf-other", comments: [{ commentMessage: "{}" }] }],
      },
      [],
      [],
      [],
      emptyMachineAssetData,
    );
    expect(result.auditTrail[0].sectionReasons).toBeUndefined();
  });

  it("returns an empty audit trail when there is no workflow history", () => {
    const result = buildActivityReviewDetail(row(), [], [], [], emptyMachineAssetData);
    expect(result.auditTrail).toEqual([]);
  });
});

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
