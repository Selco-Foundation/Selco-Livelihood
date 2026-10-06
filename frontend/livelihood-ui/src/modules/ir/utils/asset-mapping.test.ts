import { describe, expect, it } from "vitest";
import type { AssetSearchResponseItem } from "../services/asset";
import {
  ASSET_PHOTO_DOCUMENT_TYPE,
  buildMachineAssetData,
  buildSolarAssetSections,
  isResolvableAssetDocument,
} from "./asset-mapping";

describe("ASSET_PHOTO_DOCUMENT_TYPE", () => {
  it("is the exact per-item asset photo document type", () => {
    expect(ASSET_PHOTO_DOCUMENT_TYPE).toBe("ASSET");
  });
});

describe("isResolvableAssetDocument", () => {
  it("resolves the asset photo document type", () => {
    expect(isResolvableAssetDocument("ASSET")).toBe(true);
  });

  it("resolves each machine media group document type", () => {
    expect(isResolvableAssetDocument("MACHINE_ELECTRIC_BOARD")).toBe(true);
    expect(isResolvableAssetDocument("MACHINE_DEMO_VIDEO")).toBe(true);
    expect(isResolvableAssetDocument("MACHINE_END_USER_PHOTO")).toBe(true);
    expect(isResolvableAssetDocument("MACHINE_CIVIL_WORK")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isResolvableAssetDocument("asset")).toBe(true);
  });

  it("returns false for an unrelated document type", () => {
    expect(isResolvableAssetDocument("INSTALLATION_REPORT_BOM")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isResolvableAssetDocument(undefined)).toBe(false);
  });
});

function panel(overrides: Partial<AssetSearchResponseItem> = {}): AssetSearchResponseItem {
  return {
    assetId: "panel-1",
    assetTypeID: "PANEL",
    system: "DC",
    serialNumber: "SN-1",
    brandID: "ReNew",
    warrantyStartDate: "2026-09-11T12:00:00.000+00:00",
    warrantyDuration: 5,
    assetDetails: { capacity: "550 Wp" },
    documents: [],
    ...overrides,
  };
}

describe("buildSolarAssetSections", () => {
  it("builds a section only for asset types present, in PANEL/BATTERY/INVERTER order", () => {
    const assets = [
      panel({ assetId: "battery-1", assetTypeID: "BATTERY" }),
      panel({ assetId: "panel-1", assetTypeID: "PANEL" }),
    ];
    const sections = buildSolarAssetSections(assets, new Map());
    expect(sections.map((section) => section.id)).toEqual(["PANEL", "BATTERY"]);
  });

  it("returns no section for an asset type with zero rows", () => {
    expect(buildSolarAssetSections([], new Map())).toEqual([]);
  });

  it("groups assetTypeID case-insensitively", () => {
    const sections = buildSolarAssetSections([panel({ assetTypeID: "panel" })], new Map());
    expect(sections).toHaveLength(1);
    expect(sections[0].id).toBe("PANEL");
  });

  it("ignores assets whose assetTypeID is not one of the solar section ids", () => {
    const sections = buildSolarAssetSections([panel({ assetTypeID: "MACHINE" })], new Map());
    expect(sections).toEqual([]);
  });

  it("derives specifications and details from the first row in the group", () => {
    const sections = buildSolarAssetSections([panel()], new Map());
    const [section] = sections;
    expect(section.specifications).toEqual([
      { labelKey: "ES_IR_ASSET_SYSTEM", label: "System", value: "DC" },
      { labelKey: "ES_IR_SPEC_CAPACITY", label: "Capacity", value: "550 Wp" },
    ]);
    expect(section.details).toEqual([
      { labelKey: "ES_IR_DETAIL_COUNT", label: "Count", value: "1" },
      { labelKey: "ES_IR_WARRANTY_START_DATE", label: "Warranty Start Date", value: "09/11/2026" },
      { labelKey: "ES_IR_WARRANTY_DURATION", label: "Warranty Duration", value: "5 Years" },
      { labelKey: "ES_IR_ASSET_BRAND", label: "Brand", value: "ReNew" },
    ]);
    expect(section.count).toBe(1);
  });

  it("falls back every missing field to a dash", () => {
    const sections = buildSolarAssetSections(
      [
        panel({
          system: undefined,
          assetDetails: undefined,
          warrantyStartDate: undefined,
          warrantyDuration: undefined,
          brandID: undefined,
          serialNumber: undefined,
        }),
      ],
      new Map(),
    );
    const [section] = sections;
    expect(section.specifications).toEqual([
      { labelKey: "ES_IR_ASSET_SYSTEM", label: "System", value: "-" },
      { labelKey: "ES_IR_SPEC_CAPACITY", label: "Capacity", value: "-" },
    ]);
    expect(section.details).toEqual([
      { labelKey: "ES_IR_DETAIL_COUNT", label: "Count", value: "1" },
      { labelKey: "ES_IR_WARRANTY_START_DATE", label: "Warranty Start Date", value: "-" },
      { labelKey: "ES_IR_WARRANTY_DURATION", label: "Warranty Duration", value: "-" },
      { labelKey: "ES_IR_ASSET_BRAND", label: "Brand", value: "-" },
    ]);
    expect(section.items?.[0].serialNumber).toBe("-");
  });

  it("treats an unparseable warrantyStartDate as a dash", () => {
    const sections = buildSolarAssetSections([panel({ warrantyStartDate: "not-a-date" })], new Map());
    expect(sections[0].details?.find((d) => d.labelKey === "ES_IR_WARRANTY_START_DATE")?.value).toBe(
      "-",
    );
  });

  it("builds one item per row with its own serial number, capacity and photos", () => {
    const imageUrlByFileStoreId = new Map([["fs-1", "http://files/panel-1.jpg"]]);
    const assets = [
      panel({
        assetId: "panel-1",
        serialNumber: "SN-1",
        assetDetails: { capacity: "550 Wp" },
        documents: [{ documentType: "ASSET", fileStore: "fs-1" }],
      }),
      panel({ assetId: "panel-2", serialNumber: "SN-2", assetDetails: { capacity: "400 Wp" } }),
    ];
    const sections = buildSolarAssetSections(assets, imageUrlByFileStoreId);
    expect(sections[0].items).toEqual([
      { itemNumber: 1, serialNumber: "SN-1", capacity: "550 Wp", images: [{ url: "http://files/panel-1.jpg" }] },
      { itemNumber: 2, serialNumber: "SN-2", capacity: "400 Wp", images: [] },
    ]);
  });

  it("excludes non-ASSET documents and unresolvable file store ids from item photos", () => {
    const assets = [
      panel({
        documents: [
          { documentType: "MACHINE_ELECTRIC_BOARD", fileStore: "fs-1" },
          { documentType: "ASSET", fileStore: "fs-missing" },
        ],
      }),
    ];
    const sections = buildSolarAssetSections(assets, new Map([["fs-1", "http://files/board.jpg"]]));
    expect(sections[0].items?.[0].images).toEqual([]);
  });
});

function machineAsset(overrides: Partial<AssetSearchResponseItem> = {}): AssetSearchResponseItem {
  return {
    assetId: "machine-1",
    assetTypeID: "RICE HULLER",
    name: "Huller-Rice-3-HP",
    boundaryCode: "BOUNDARY_CODE_1",
    serialNumber: "SN-100",
    warrantyStartDate: "2026-09-11T12:00:00.000+00:00",
    warrantyDuration: 2,
    assetDetails: { capacity: "3 HP", poNumber: "PO-1", invoiceNumber: "INV-1" },
    documents: [],
    ...overrides,
  };
}

describe("buildMachineAssetData", () => {
  it("returns undefined details, empty items, but full media groups when there are no assets", () => {
    const result = buildMachineAssetData([], new Map());
    expect(result.details).toBeUndefined();
    expect(result.items).toEqual([]);
    expect(result.mediaGroups.map((group) => group.id)).toEqual([
      "MACHINE_ELECTRIC_BOARD",
      "MACHINE_DEMO_VIDEO",
      "MACHINE_END_USER_PHOTO",
      "MACHINE_CIVIL_WORK",
    ]);
    expect(result.mediaGroups.every((group) => group.images.length === 0 && group.videos.length === 0)).toBe(
      true,
    );
  });

  it("derives details from the first asset", () => {
    const result = buildMachineAssetData([machineAsset()], new Map());
    expect(result.details).toEqual([
      {
        labelKey: "ES_IR_MACHINE",
        label: "Machine",
        value: "BOUNDARY_CODE_1",
        valueKey: "BOUNDARY_BOUNDARY_CODE_1",
      },
      { labelKey: "ES_IR_MACHINE_SERIAL_NUMBER", label: "Machine Serial Number", value: "SN-100" },
      { labelKey: "ES_IR_MACHINE_SPEC_CAPACITY", label: "Specifications / Capacity", value: "3 HP" },
      { labelKey: "ES_IR_MACHINE_PO_NUMBER", label: "PO Number", value: "PO-1" },
      {
        labelKey: "ES_IR_MACHINE_INVOICE_NUMBER",
        label: "Manufacturer Invoice Number",
        value: "INV-1",
      },
      { labelKey: "ES_IR_WARRANTY_START_DATE", label: "Warranty Start Date", value: "09/11/2026" },
      { labelKey: "ES_IR_WARRANTY_DURATION", label: "Warranty Duration", value: "2 Years" },
    ]);
  });

  it("leaves valueKey undefined when boundaryCode is missing", () => {
    const result = buildMachineAssetData([machineAsset({ boundaryCode: undefined })], new Map());
    const machineDetail = result.details?.find((d) => d.labelKey === "ES_IR_MACHINE");
    expect(machineDetail?.value).toBe("-");
    expect(machineDetail?.valueKey).toBeUndefined();
  });

  it("builds one item per asset, labeled by name, falling back to assetTypeID", () => {
    const result = buildMachineAssetData(
      [machineAsset({ name: "Huller-Rice-3-HP" }), machineAsset({ assetId: "machine-2", name: undefined })],
      new Map(),
    );
    expect(result.items).toEqual([
      { itemNumber: 1, label: "Huller-Rice-3-HP", images: [] },
      { itemNumber: 2, label: "RICE HULLER", images: [] },
    ]);
  });

  it("groups every asset's documents into the matching machine media group", () => {
    const assets = [
      machineAsset({
        documents: [
          { documentType: "MACHINE_ELECTRIC_BOARD", fileStore: "fs-1" },
          { documentType: "MACHINE_DEMO_VIDEO", fileStore: "fs-2" },
        ],
      }),
    ];
    const imageUrlByFileStoreId = new Map([
      ["fs-1", "http://files/board.jpg"],
      ["fs-2", "http://files/demo.mp4"],
    ]);
    const result = buildMachineAssetData(assets, imageUrlByFileStoreId);
    const electricBoard = result.mediaGroups.find((g) => g.id === "MACHINE_ELECTRIC_BOARD");
    const demoVideo = result.mediaGroups.find((g) => g.id === "MACHINE_DEMO_VIDEO");
    expect(electricBoard?.images).toEqual([{ url: "http://files/board.jpg" }]);
    expect(demoVideo?.videos).toEqual([{ url: "http://files/demo.mp4" }]);
  });

  it("excludes a media document with an unresolvable file store id", () => {
    const assets = [machineAsset({ documents: [{ documentType: "MACHINE_ELECTRIC_BOARD", fileStore: "fs-missing" }] })];
    const result = buildMachineAssetData(assets, new Map());
    const electricBoard = result.mediaGroups.find((g) => g.id === "MACHINE_ELECTRIC_BOARD");
    expect(electricBoard?.images).toEqual([]);
  });
});
