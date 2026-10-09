import { translateOr, type BoundaryHierarchy, type BoundaryNode, type useTranslate } from "@/shared";
import type { FacilitySearchFilters } from "../types/facility";

/** Nodes whose parent is one of the selected parent codes, or every node when none are selected — matches ir/im's cascading-select convention. */
export function cascadeByParent(nodes: BoundaryNode[], selectedParentCodes: string[]): BoundaryNode[] {
  if (selectedParentCodes.length === 0) {
    return nodes;
  }
  return nodes.filter((node) => selectedParentCodes.includes(node.parentCode));
}

/** Display name for a boundary code — same localization convention as im/ir (`BOUNDARY_<code>`), falling back to the raw code when no translation exists. */
export function boundaryDisplayName(
  code: string,
  t: ReturnType<typeof useTranslate>["t"],
): string {
  return translateOr(t, `BOUNDARY_${code}`, code);
}

/**
 * The `Facility` `_bulk-search` endpoint only narrows results by leaf
 * `boundaryCodes` (see `services/facility.ts`) — this resolves a
 * State/District/Block/Facility filter selection down to that leaf-code list,
 * same shape as `ir`'s `resolveBoundaryCodes` but starting from any tier
 * (state down to a specific facility) since this module's filter isn't
 * pre-scoped to one plan's state.
 */
export function resolveFacilityBoundaryCodes(
  filters: FacilitySearchFilters,
  boundaryData: BoundaryHierarchy | undefined,
): string[] | undefined {
  if (filters.facility.length > 0) {
    return filters.facility;
  }

  let blockCodes: string[] | undefined;
  if (filters.block.length > 0) {
    blockCodes = filters.block;
  } else if (filters.district.length > 0) {
    blockCodes = cascadeByParent(boundaryData?.blocks ?? [], filters.district).map((block) => block.code);
  } else if (filters.state.length > 0) {
    const districtCodes = cascadeByParent(boundaryData?.districts ?? [], filters.state).map(
      (district) => district.code,
    );
    blockCodes = cascadeByParent(boundaryData?.blocks ?? [], districtCodes).map((block) => block.code);
  }

  if (!blockCodes) {
    return undefined;
  }

  return cascadeByParent(boundaryData?.facilities ?? [], blockCodes).map((facility) => facility.code);
}
