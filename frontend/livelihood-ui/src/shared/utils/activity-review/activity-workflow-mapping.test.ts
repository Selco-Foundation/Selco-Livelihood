import { describe, expect, it } from "vitest";
import type { AssetSectionContent, ReviewSectionContent } from "@/ui";
import type { InstallationImageCriterion } from "./installation-image-mapping";
import type { RejectionReasonOption } from "./rejection-reason-mapping";
import type { MachineAssetData } from "./asset-mapping";
import {
  buildAuditTrail,
  buildImageChecklistSections,
  buildMachineSection,
  buildReportSection,
  buildReviewSections,
  buildSectionDocuments,
  humanize,
  type ActivityTransaction,
  type ActivityWorkflowEntry,
} from "./activity-workflow-mapping";

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

describe("buildMachineSection", () => {
  it("includes only the vendor/installedBy/reportNumber specifications actually present on the BOM", () => {
    const section = buildMachineSection(
      { reportNumber: "RPT-1", additionalDetails: { vendorOrgName: "Acme Vendor" } },
      emptyMachineAssetData,
    );
    expect(section.specifications).toEqual([
      { labelKey: "ES_IR_MACHINE_VENDOR_ORG", label: "Vendor", value: "Acme Vendor" },
      { labelKey: "ES_IR_MACHINE_REPORT_NUMBER", label: "Report Number", value: "RPT-1" },
    ]);
  });

  it("falls back to BOM components as items when the machine has no registered asset items yet", () => {
    const section = buildMachineSection(
      { data: { components: [{ slNo: 1, product: "Motor", capacity: "3 HP", quantity: 2 }] } },
      emptyMachineAssetData,
    );
    expect(section.items).toEqual([{ itemNumber: 1, label: "Motor", capacity: "3 HP", quantity: 2, images: [] }]);
  });

  it("prefers real registered asset items over BOM components once available", () => {
    const machineAssetData: MachineAssetData = {
      details: undefined,
      items: [{ itemNumber: 1, label: "Registered Motor", images: [] }],
      mediaGroups: [],
    };
    const section = buildMachineSection(
      { data: { components: [{ product: "BOM Motor" }] } },
      machineAssetData,
    );
    expect(section.items).toEqual([{ itemNumber: 1, label: "Registered Motor", images: [] }]);
  });

  it("numbers fallback BOM-component items from their index when slNo is missing", () => {
    const section = buildMachineSection(
      { data: { components: [{ product: "A" }, { product: "B" }] } },
      emptyMachineAssetData,
    );
    expect(section.items?.map((item) => item.itemNumber)).toEqual([1, 2]);
  });

  it("carries the machine asset data's details and media groups straight through", () => {
    const machineAssetData: MachineAssetData = {
      details: [{ labelKey: "ES_IR_MACHINE", label: "Machine", value: "BOUNDARY_1" }],
      items: [],
      mediaGroups: [{ id: "MACHINE_ELECTRIC_BOARD", labelKey: "ES_IR_MACHINE_ELECTRIC_BOARD", label: "Electric Board", images: [], videos: [] }],
    };
    const section = buildMachineSection(undefined, machineAssetData);
    expect(section.details).toBe(machineAssetData.details);
    expect(section.mediaGroups).toBe(machineAssetData.mediaGroups);
  });
});

describe("buildReportSection", () => {
  it("includes the purchase order number spec when present on the BOM", () => {
    const section = buildReportSection({ data: { purchaseOrderNumber: "PO-1" } });
    expect(section.specifications).toEqual([
      { labelKey: "ES_IR_PURCHASE_ORDER_NUMBER", label: "Purchase Order Number", value: "PO-1" },
    ]);
  });

  it("has no specifications when the BOM has no purchase order number", () => {
    expect(buildReportSection(undefined).specifications).toEqual([]);
  });

  it("always starts with a null report and no supporting documents — resolved later, lazily, on expand", () => {
    const section = buildReportSection(undefined);
    expect(section.report).toBeNull();
    expect(section.supportingDocuments).toEqual([]);
  });
});

describe("buildImageChecklistSections", () => {
  it("builds one section per criterion, labeled from its description", () => {
    const criteria: InstallationImageCriterion[] = [
      { code: "SITE_OVERVIEW", description: "Site overview photo" },
      { code: "NAMEPLATE", description: "Nameplate photo" },
    ];
    expect(buildImageChecklistSections(criteria)).toEqual([
      { kind: "IMAGE_CHECKLIST", id: "INSTALLATION_IMAGE_SITE_OVERVIEW", label: "Site overview photo", images: [] },
      { kind: "IMAGE_CHECKLIST", id: "INSTALLATION_IMAGE_NAMEPLATE", label: "Nameplate photo", images: [] },
    ]);
  });

  it("returns an empty array for no criteria", () => {
    expect(buildImageChecklistSections([])).toEqual([]);
  });
});

const builtPanelSection: AssetSectionContent = {
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

describe("buildReviewSections", () => {
  it("appends the report section and every image-checklist criterion for a solar activity", () => {
    const criteria: InstallationImageCriterion[] = [
      { code: "SITE_OVERVIEW", description: "Site overview photo" },
    ];
    const sections = buildReviewSections("SOLAR", undefined, [builtPanelSection], emptyMachineAssetData, criteria);

    expect(sections.map((s) => s.id)).toEqual([
      "PANEL",
      "INSTALLATION_COMPLETION_REPORT",
      "INSTALLATION_IMAGE_SITE_OVERVIEW",
    ]);
    expect(sections[0]).toBe(builtPanelSection);
  });

  it("does not append image-checklist sections for a machine activity", () => {
    const criteria: InstallationImageCriterion[] = [
      { code: "SITE_OVERVIEW", description: "Site overview photo" },
    ];
    const sections = buildReviewSections(
      "MACHINE",
      undefined,
      [builtPanelSection],
      emptyMachineAssetData,
      criteria,
    );
    expect(sections.map((s) => s.id)).toEqual(["MACHINE", "INSTALLATION_COMPLETION_REPORT"]);
  });

  it("ignores solarAssetSections entirely for a machine activity", () => {
    const sections = buildReviewSections("MACHINE", undefined, [builtPanelSection], emptyMachineAssetData, []);
    expect(sections.some((s) => s.id === "PANEL")).toBe(false);
  });

  it("treats a missing componentType as solar", () => {
    const sections = buildReviewSections(undefined, undefined, [builtPanelSection], emptyMachineAssetData, []);
    expect(sections.some((s) => s.id === "PANEL")).toBe(true);
  });
});

const panelSection: AssetSectionContent = {
  kind: "ASSET",
  id: "PANEL",
  labelKey: "ES_IR_SECTION_PANEL",
  label: "Panel",
  specifications: [],
  images: [],
  videos: [],
};

describe("buildSectionDocuments", () => {
  it("distributes documents into their matching section by classified key", () => {
    const sections: ReviewSectionContent[] = [
      panelSection,
      { kind: "REPORT", id: "INSTALLATION_COMPLETION_REPORT", labelKey: "ES_IR_REPORT", label: "Report", report: null, supportingDocuments: [] },
      { kind: "IMAGE_CHECKLIST", id: "INSTALLATION_IMAGE_SITE_OVERVIEW", label: "Site overview photo", images: [] },
    ];
    const latestDocuments = [
      { documentType: "PANEL-IMAGE-FRONT", fileStoreId: "1" },
      { documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "2" },
      { documentType: "INSTALLATION_IMAGE-SITE_OVERVIEW", fileStoreId: "3" },
    ];

    const result = buildSectionDocuments(sections, latestDocuments);

    expect(result.PANEL).toEqual([{ documentType: "PANEL-IMAGE-FRONT", fileStoreId: "1" }]);
    expect(result.INSTALLATION_COMPLETION_REPORT).toEqual([
      { documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "2" },
    ]);
    expect(result.INSTALLATION_IMAGE_SITE_OVERVIEW).toEqual([
      { documentType: "INSTALLATION_IMAGE-SITE_OVERVIEW", fileStoreId: "3" },
    ]);
  });

  it("uppercases an installation-image criterion code before matching its document suffix", () => {
    const sections: ReviewSectionContent[] = [
      { kind: "IMAGE_CHECKLIST", id: "INSTALLATION_IMAGE_earthing", label: "Earthing photo", images: [] },
    ];
    const latestDocuments = [{ documentType: "INSTALLATION_IMAGE-earthing", fileStoreId: "1" }];

    const result = buildSectionDocuments(sections, latestDocuments);

    expect(result.INSTALLATION_IMAGE_earthing).toEqual([
      { documentType: "INSTALLATION_IMAGE-earthing", fileStoreId: "1" },
    ]);
  });

  it("defaults every section to an empty array when there are no documents", () => {
    const result = buildSectionDocuments([panelSection], []);
    expect(result.PANEL).toEqual([]);
  });
});

describe("buildAuditTrail", () => {
  it("maps each workflow entry to a checkpoint, defaulting status and date when missing", () => {
    const workflow: ActivityWorkflowEntry[] = [{ comment: "looks good", assigner: { name: "Reviewer One" } }];
    expect(buildAuditTrail(workflow, [], [])).toEqual([
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
    const result = buildAuditTrail([{ id: "wf-1", auditDetails: { createdTime } }], [], []);
    expect(result[0].id).toBe("wf-1");
    expect(result[0].date).toBe("09/11/2026");
  });

  it("resolves a rejection reason code to its name from the reason options, grouped by assetType", () => {
    const reasonOptions: RejectionReasonOption[] = [{ code: "DAMAGED", name: "Damaged Goods" }];
    const transactions: ActivityTransaction[] = [
      {
        processInstanceId: "wf-1",
        comments: [
          { assetType: "PANEL", commentMessage: JSON.stringify({ reasonCode: "DAMAGED", comment: "cracked panel" }) },
        ],
      },
    ];
    const result = buildAuditTrail([{ id: "wf-1" }], transactions, reasonOptions);
    expect(result[0].sectionReasons).toEqual([
      { sectionId: "PANEL", sectionLabel: "Panel", reasons: [{ reasonLabel: "Damaged Goods", comment: "cracked panel" }] },
    ]);
  });

  it("falls back to a humanized reason code when it isn't found in the reason options", () => {
    const transactions: ActivityTransaction[] = [
      {
        processInstanceId: "wf-1",
        comments: [{ assetType: "PANEL", commentMessage: JSON.stringify({ reasonCode: "NOT_LISTED", comment: "" }) }],
      },
    ];
    const result = buildAuditTrail([{ id: "wf-1" }], transactions, []);
    expect(result[0].sectionReasons?.[0].reasons[0].reasonLabel).toBe("Not Listed");
  });

  it("defaults the section id to OTHER when a comment has no assetType", () => {
    const transactions: ActivityTransaction[] = [
      { processInstanceId: "wf-1", comments: [{ commentMessage: JSON.stringify({ comment: "generic issue" }) }] },
    ];
    const result = buildAuditTrail([{ id: "wf-1" }], transactions, []);
    expect(result[0].sectionReasons).toEqual([
      { sectionId: "OTHER", sectionLabel: "Other", reasons: [{ reasonLabel: "OTHER", comment: "generic issue" }] },
    ]);
  });

  it("treats a non-JSON commentMessage as plain comment text", () => {
    const transactions: ActivityTransaction[] = [
      { processInstanceId: "wf-1", comments: [{ assetType: "PANEL", commentMessage: "not json" }] },
    ];
    const result = buildAuditTrail([{ id: "wf-1" }], transactions, []);
    expect(result[0].sectionReasons).toEqual([
      { sectionId: "PANEL", sectionLabel: "Panel", reasons: [{ reasonLabel: "PANEL", comment: "not json" }] },
    ]);
  });

  it("groups multiple comments for the same section into one entry's reasons list", () => {
    const transactions: ActivityTransaction[] = [
      {
        processInstanceId: "wf-1",
        comments: [
          { assetType: "PANEL", commentMessage: JSON.stringify({ comment: "issue 1" }) },
          { assetType: "PANEL", commentMessage: JSON.stringify({ comment: "issue 2" }) },
        ],
      },
    ];
    const result = buildAuditTrail([{ id: "wf-1" }], transactions, []);
    expect(result[0].sectionReasons).toHaveLength(1);
    expect(result[0].sectionReasons?.[0].reasons).toEqual([
      { reasonLabel: "PANEL", comment: "issue 1" },
      { reasonLabel: "PANEL", comment: "issue 2" },
    ]);
  });

  it("leaves sectionReasons undefined when the matching transaction has no comments", () => {
    const transactions: ActivityTransaction[] = [{ processInstanceId: "wf-1", comments: [] }];
    const result = buildAuditTrail([{ id: "wf-1" }], transactions, []);
    expect(result[0].sectionReasons).toBeUndefined();
  });

  it("leaves sectionReasons undefined when no transaction matches the entry's id", () => {
    const transactions: ActivityTransaction[] = [{ processInstanceId: "wf-other", comments: [{ commentMessage: "{}" }] }];
    const result = buildAuditTrail([{ id: "wf-1" }], transactions, []);
    expect(result[0].sectionReasons).toBeUndefined();
  });

  it("returns an empty audit trail when there is no workflow history", () => {
    expect(buildAuditTrail(undefined, [], [])).toEqual([]);
  });
});
