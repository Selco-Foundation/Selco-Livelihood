import { translateOr, type BoundaryNode, type useTranslate } from "@/shared";

/**
 * The ActivityFacility search's own `boundaryCodes` param matches only the
 * leaf-level per-facility boundary code (e.g. `..._BORABARI_ED/2026/0093`),
 * not a district/block code directly (confirmed against the real backend —
 * passing a block code alone returns zero rows). So a District/Block
 * selection has to be expanded two hops down the boundary tree: selected
 * block(s) (or every block under selected district(s), qc's Filter.js
 * expansion) -> every leaf facility boundary node under those blocks.
 */
export function resolveBoundaryCodes(
  filters: { district: string[]; block: string[] },
  blocks: BoundaryNode[],
  facilities: BoundaryNode[],
): string[] | undefined {
  let blockCodes: string[] | undefined;
  if (filters.block.length > 0) {
    blockCodes = filters.block;
  } else if (filters.district.length > 0) {
    blockCodes = blocks
      .filter((block) => filters.district.includes(block.parentCode))
      .map((block) => block.code);
  }

  if (!blockCodes) {
    return undefined;
  }

  return facilities
    .filter((facility) => blockCodes!.includes(facility.parentCode))
    .map((facility) => facility.code);
}

/** Blocks under the selected districts, or every block when none are selected — matches im's InboxFilter cascading. */
export function cascadeBlockOptions(blocks: BoundaryNode[], selectedDistrictCodes: string[]): BoundaryNode[] {
  if (selectedDistrictCodes.length === 0) {
    return blocks;
  }
  return blocks.filter((block) => selectedDistrictCodes.includes(block.parentCode));
}

/** Display name for a boundary code — same localization convention as im/qc (`BOUNDARY_<code>`), falling back to the raw code when no translation exists. */
export function boundaryDisplayName(
  code: string,
  t: ReturnType<typeof useTranslate>["t"],
): string {
  return translateOr(t, `BOUNDARY_${code}`, code);
}
