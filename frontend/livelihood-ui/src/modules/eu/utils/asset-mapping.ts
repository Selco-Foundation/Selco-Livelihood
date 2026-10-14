import type { AssetItem, AssetSectionContent, LabeledValue, MediaGroup, SectionImage, SectionVideo } from "@/ui";
import { MACHINE_MEDIA_GROUPS, REVIEW_SECTION_LABELS, type SolarSectionId } from "../constants/review";
import type { AssetSearchDocument, AssetSearchResponseItem } from "../services/asset";

const BLANK = "-";
const SOLAR_ASSET_TYPE_IDS: SolarSectionId[] = ["PANEL", "BATTERY", "INVERTER"];
/** Every per-item asset photo (Solar's Panel/Battery/Inverter and Machine's
 * own item photos) is tagged with the exact documentType `ASSET` — mirrors
 * ir's services/asset.ts; the asset's own assetTypeID (not documentType) is
 * what distinguishes which physical unit a photo belongs to. */
export const ASSET_PHOTO_DOCUMENT_TYPE = "ASSET";

const MACHINE_MEDIA_DOCUMENT_TYPE_IDS = new Set<string>(MACHINE_MEDIA_GROUPS.map((group) => group.id));

/** Every asset-registry document type this module resolves to a filestore
 * URL — mirrors ir's isResolvableAssetDocument. */
export function isResolvableAssetDocument(documentType: string | undefined): boolean {
  const type = documentType?.toUpperCase();
  if (!type) {
    return false;
  }
  return type === ASSET_PHOTO_DOCUMENT_TYPE || MACHINE_MEDIA_DOCUMENT_TYPE_IDS.has(type);
}

/**
 * Reconstructs the flat asset list this module was built against from the
 * asset-registry's parent/child search response (`includeChildren: true`) —
 * mirrors ir's flattenAssetHierarchy.
 */
export function flattenAssetHierarchy(
  assets: AssetSearchResponseItem[],
): AssetSearchResponseItem[] {
  return assets.flatMap((asset) => [asset, ...flattenAssetHierarchy(asset.children ?? [])]);
}

function assetCapacity(details: Record<string, unknown> | undefined): string | undefined {
  const capacity = details?.capacity;
  return typeof capacity === "string" && capacity.trim() ? capacity : undefined;
}

function rawValue(value: string | undefined): string {
  return value?.trim() || BLANK;
}

function warrantyStartDateValue(value: string | undefined): string {
  if (!value) {
    return BLANK;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return BLANK;
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function warrantyDurationValue(years: number | undefined): string {
  return typeof years === "number" ? `${years} Years` : BLANK;
}

function stringFromDetails(
  details: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = details?.[key];
  return typeof value === "string" ? value : undefined;
}

/** Every physical unit's own asset-registry photos — shared by Solar's
 * per-panel/battery/inverter items and Machine's per-component items. */
function assetPhotoImages(
  documents: AssetSearchDocument[] | null | undefined,
  imageUrlByFileStoreId: Map<string, string>,
): SectionImage[] {
  return (documents ?? [])
    .filter((document) => document.documentType?.toUpperCase() === ASSET_PHOTO_DOCUMENT_TYPE)
    .map((document) => (document.fileStore ? imageUrlByFileStoreId.get(document.fileStore) : undefined))
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ url }));
}

/**
 * Builds the Panel/Battery/Inverter review sections straight from the
 * asset-registry search response — mirrors ir's buildSolarAssetSections
 * field-for-field, so the same activity's Solar sections read identically
 * whether viewed from the reviewer's or the end user's page.
 */
export function buildSolarAssetSections(
  assets: AssetSearchResponseItem[],
  imageUrlByFileStoreId: Map<string, string>,
): AssetSectionContent[] {
  const grouped = new Map<SolarSectionId, AssetSearchResponseItem[]>();
  for (const asset of assets) {
    const assetTypeId = asset.assetTypeID?.toUpperCase();
    if ((SOLAR_ASSET_TYPE_IDS as string[]).includes(assetTypeId ?? "")) {
      const id = assetTypeId as SolarSectionId;
      grouped.set(id, [...(grouped.get(id) ?? []), asset]);
    }
  }

  return SOLAR_ASSET_TYPE_IDS.filter((id) => grouped.get(id)?.length).map((id) => {
    const rows = grouped.get(id) ?? [];
    const { labelKey, label } = REVIEW_SECTION_LABELS[id];
    const first = rows[0];

    const specifications: LabeledValue[] = [
      { labelKey: "ES_IR_ASSET_SYSTEM", label: "System", value: rawValue(first.system) },
      {
        labelKey: "ES_IR_SPEC_CAPACITY",
        label: "Capacity",
        value: assetCapacity(first.assetDetails) ?? BLANK,
      },
    ];

    const details: LabeledValue[] = [
      { labelKey: "ES_IR_DETAIL_COUNT", label: "Count", value: String(rows.length) },
      {
        labelKey: "ES_IR_WARRANTY_START_DATE",
        label: "Warranty Start Date",
        value: warrantyStartDateValue(first.warrantyStartDate),
      },
      {
        labelKey: "ES_IR_WARRANTY_DURATION",
        label: "Warranty Duration",
        value: warrantyDurationValue(first.warrantyDuration),
      },
      { labelKey: "ES_IR_ASSET_BRAND", label: "Brand", value: rawValue(first.brandID) },
    ];

    const items: AssetItem[] = rows.map((asset, index) => ({
      itemNumber: index + 1,
      serialNumber: asset.serialNumber || BLANK,
      capacity: assetCapacity(asset.assetDetails) ?? BLANK,
      images: assetPhotoImages(asset.documents, imageUrlByFileStoreId),
    }));

    return {
      kind: "ASSET",
      id,
      labelKey,
      label,
      count: rows.length,
      specifications,
      details,
      items,
      images: [],
      videos: [],
    } satisfies AssetSectionContent;
  });
}

/** Machine's asset-sourced content — mirrors ir's MachineAssetData/
 * buildMachineAssetData. */
export interface MachineAssetData {
  details: LabeledValue[] | undefined;
  items: AssetItem[];
  mediaGroups: MediaGroup[];
}

function buildMachineMediaGroups(
  assets: AssetSearchResponseItem[],
  imageUrlByFileStoreId: Map<string, string>,
): MediaGroup[] {
  const allDocuments = assets.flatMap((asset) => asset.documents ?? []);

  return MACHINE_MEDIA_GROUPS.map((group) => {
    const images: SectionImage[] = [];
    const videos: SectionVideo[] = [];

    for (const document of allDocuments) {
      const url = document.fileStore ? imageUrlByFileStoreId.get(document.fileStore) : undefined;
      if (!url || document.documentType?.toUpperCase() !== group.id) {
        continue;
      }
      (group.kind === "VIDEO" ? videos : images).push({ url });
    }

    return { id: group.id, labelKey: group.labelKey, label: group.label, images, videos };
  });
}

export function buildMachineAssetData(
  assets: AssetSearchResponseItem[],
  imageUrlByFileStoreId: Map<string, string>,
): MachineAssetData {
  const mediaGroups = buildMachineMediaGroups(assets, imageUrlByFileStoreId);

  if (assets.length === 0) {
    return { details: undefined, items: [], mediaGroups };
  }

  const first = assets[0];

  const details: LabeledValue[] = [
    {
      labelKey: "ES_IR_MACHINE",
      label: "Machine",
      value: rawValue(first.boundaryCode),
      valueKey: first.boundaryCode ? `BOUNDARY_${first.boundaryCode}` : undefined,
    },
    {
      labelKey: "ES_IR_MACHINE_SERIAL_NUMBER",
      label: "Machine Serial Number",
      value: rawValue(first.serialNumber),
    },
    {
      labelKey: "ES_IR_MACHINE_SPEC_CAPACITY",
      label: "Specifications / Capacity",
      value: assetCapacity(first.assetDetails) ?? BLANK,
    },
    {
      labelKey: "ES_IR_MACHINE_PO_NUMBER",
      label: "PO Number",
      value: rawValue(stringFromDetails(first.assetDetails, "poNumber")),
    },
    {
      labelKey: "ES_IR_MACHINE_INVOICE_NUMBER",
      label: "Manufacturer Invoice Number",
      value: rawValue(stringFromDetails(first.assetDetails, "invoiceNumber")),
    },
    {
      labelKey: "ES_IR_WARRANTY_START_DATE",
      label: "Warranty Start Date",
      value: warrantyStartDateValue(first.warrantyStartDate),
    },
    {
      labelKey: "ES_IR_WARRANTY_DURATION",
      label: "Warranty Duration",
      value: warrantyDurationValue(first.warrantyDuration),
    },
  ];

  const items: AssetItem[] = assets.map((asset, index) => ({
    itemNumber: index + 1,
    label: asset.name || asset.assetTypeID,
    images: assetPhotoImages(asset.documents, imageUrlByFileStoreId),
  }));

  return { details, items, mediaGroups };
}
