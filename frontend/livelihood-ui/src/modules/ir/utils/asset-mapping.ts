import { MACHINE_MEDIA_GROUPS, REVIEW_SECTION_LABELS } from "../constants/review";
import type { AssetSearchDocument, AssetSearchResponseItem } from "../services/asset";
import type {
  AssetItem,
  AssetSectionContent,
  LabeledValue,
  MediaGroup,
  SectionImage,
  SectionVideo,
  SolarSectionId,
} from "../types/facility-review";

const BLANK = "-";
const SOLAR_ASSET_TYPE_IDS: SolarSectionId[] = ["PANEL", "BATTERY", "INVERTER"];
// Per-item asset photos are tagged `ASSET_PHOTO-<lowercase assetTypeId>` (e.g.
// `ASSET_PHOTO-panel`) — verified against a real asset-registry response;
// matched by prefix since the exact suffix is redundant with the asset's own
// assetTypeID. Exported so hooks/use-facility-review.ts's fileStoreId
// collection uses the same check as this file's own item-image filter.
export const ASSET_PHOTO_DOCUMENT_TYPE_PREFIX = "ASSET_PHOTO";

const MACHINE_MEDIA_DOCUMENT_TYPE_IDS = new Set<string>(MACHINE_MEDIA_GROUPS.map((group) => group.id));

/** Every asset-registry document type this module resolves to a filestore
 * URL — Solar's per-item photos (`ASSET_PHOTO-*`) and Machine's four media
 * groups (`MACHINE_ELECTRIC_BOARD` etc). Exported so
 * hooks/use-facility-review.ts's fileStoreId collection requests exactly
 * what buildSolarAssetSections/buildMachineAssetData actually consume —
 * otherwise a resolvable document's URL never gets fetched at all. */
export function isResolvableAssetDocument(documentType: string | undefined): boolean {
  const type = documentType?.toUpperCase();
  if (!type) {
    return false;
  }
  return type.startsWith(ASSET_PHOTO_DOCUMENT_TYPE_PREFIX) || MACHINE_MEDIA_DOCUMENT_TYPE_IDS.has(type);
}

/** `assetDetails` uses one generic shape across every asset type — verified
 * against a real response: `{ name, capacity: "550 Wp", capacityUnit,
 * totalCapacity }` — not qc's per-type-prefixed fields (`panelCapacity` etc).
 * `capacity` already comes pre-formatted with its unit. */
function assetCapacity(details: Record<string, unknown> | undefined): string | undefined {
  const capacity = details?.capacity;
  return typeof capacity === "string" && capacity.trim() ? capacity : undefined;
}

/** `system`/`brandID` come back already human-readable (e.g. "DC", "ReNew") —
 * displayed as-is; humanizing would mangle their casing. */
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
    .filter((document) => document.documentType?.toUpperCase().startsWith(ASSET_PHOTO_DOCUMENT_TYPE_PREFIX))
    .map((document) => (document.fileStore ? imageUrlByFileStoreId.get(document.fileStore) : undefined))
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ url }));
}

/**
 * Builds the Panel/Battery/Inverter review sections straight from the
 * asset-registry search response — matches qc's `useAsset.js` `formatData`
 * field-for-field (specifications: system/capacity; details: count/warranty
 * start/warranty duration/brand; one item per physical asset with its own
 * serial number, capacity, and photos). Any field the API doesn't return is
 * rendered as "-" rather than omitted or left as "undefined", and an asset
 * type with zero rows produces no section at all (same as qc, whose page
 * only ever renders a Summary for asset types actually present).
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
      { labelKey: "ES_IR_ASSET_COUNT", label: "Count", value: String(rows.length) },
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

/** Machine's asset-sourced content — merged into buildMachineSection's BOM-
 * derived specifications (vendor/installed-by/report-number aren't part of
 * asset data, so those stay separate). Unlike Solar, a Machine's
 * assetTypeID isn't a fixed enum to group by (verified real values include
 * both the generic "MACHINE" and specific product names like "RICE HULLER")
 * — every asset returned for the facility is treated as one of its
 * components, one item each. Every real sample observed had exactly one
 * asset per facility, but the shape supports more.
 */
export interface MachineAssetData {
  /** Undefined (not rendered) when no assets exist yet. */
  details: LabeledValue[] | undefined;
  items: AssetItem[];
  mediaGroups: MediaGroup[];
}

/** Electric Board / Demo Test / Photo with End User / Civil Work — each
 * group's documents live directly on the asset's own `documents` array
 * (not workflow documents), tagged with that exact documentType. Always
 * returns all four groups (even with empty images/videos) so the accordion
 * shows every expected sub-section before anything's been uploaded. */
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

  // Facts about the machine itself (serial number, spec) plus procurement/
  // warranty — grouped under "Details", separate from buildMachineSection's
  // "Installation Details" (vendor/installed-by/report-number), which is
  // about the install, not the machine.
  const details: LabeledValue[] = [
    {
      labelKey: "ES_IR_MACHINE_SERIAL_NUMBER",
      label: "Machine Serial Number",
      value: rawValue(first.serialNumber),
    },
    {
      labelKey: "ES_IR_MACHINE_MOTOR_CAPACITY",
      label: "Machine Specifications/Motor Capacity",
      value: rawValue(first.modelNumber),
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
