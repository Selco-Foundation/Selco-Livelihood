import { REVIEW_SECTION_LABELS } from "../constants/review";
import type { AssetSearchResponseItem } from "../services/asset";
import type { AssetItem, AssetSectionContent, LabeledValue, SolarSectionId } from "../types/facility-review";

const BLANK = "-";
const SOLAR_ASSET_TYPE_IDS: SolarSectionId[] = ["PANEL", "BATTERY", "INVERTER"];
// Per-item asset photos are tagged `ASSET_PHOTO-<lowercase assetTypeId>` (e.g.
// `ASSET_PHOTO-panel`) — verified against a real asset-registry response;
// matched by prefix since the exact suffix is redundant with the asset's own
// assetTypeID. Exported so hooks/use-facility-review.ts's fileStoreId
// collection uses the same check as this file's own item-image filter.
export const ASSET_PHOTO_DOCUMENT_TYPE_PREFIX = "ASSET_PHOTO";

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
      images: (asset.documents ?? [])
        .filter((document) =>
          document.documentType?.toUpperCase().startsWith(ASSET_PHOTO_DOCUMENT_TYPE_PREFIX),
        )
        .map((document) => (document.fileStore ? imageUrlByFileStoreId.get(document.fileStore) : undefined))
        .filter((url): url is string => Boolean(url))
        .map((url) => ({ url })),
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
