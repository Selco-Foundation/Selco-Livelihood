import type { BoundaryHierarchy } from "../api/boundary";

/** A State → District → Block selection, held as boundary codes at each level. */
export interface BoundarySelection {
  states: string[];
  districts: string[];
  blocks: string[];
}

export const EMPTY_BOUNDARY_SELECTION: BoundarySelection = { states: [], districts: [], blocks: [] };

/** One node of the `boundary_data` tree ingestion-service's template endpoints take
 *  (country -> state -> district -> block), parsed there by `flatten_boundaries`. */
export interface BoundaryDataNode {
  boundaryCode: string;
  type: "country" | "state" | "district" | "block";
  name: string;
  children?: BoundaryDataNode[];
}

function parentOf(nodes: BoundaryHierarchy["districts"]): Map<string, string> {
  return new Map((nodes ?? []).map((node) => [node.code, node.parentCode]));
}

/**
 * Drops every district whose state is no longer selected and every block whose district is no
 * longer selected, so deselecting a parent never leaves orphaned children behind. Parent links
 * come from the hierarchy, not the selection, so a child picked under a parent stays tied to it.
 */
export function pruneBoundarySelection(
  selection: BoundarySelection,
  hierarchy: BoundaryHierarchy | undefined,
): BoundarySelection {
  const districtParent = parentOf(hierarchy?.districts);
  const blockParent = parentOf(hierarchy?.blocks);
  const states = new Set(selection.states);
  const districts = selection.districts.filter((code) => states.has(districtParent.get(code) ?? ""));
  const keptDistricts = new Set(districts);
  const blocks = selection.blocks.filter((code) => keptDistricts.has(blockParent.get(code) ?? ""));
  return { states: selection.states, districts, blocks };
}

/**
 * The selection as the nested `boundary_data` tree. Only branches that end in a selected block
 * are included - the template holds blocks, so a state or district with no block picked under it
 * adds nothing. `name` carries the code: the server resolves display names itself.
 */
export function buildBoundaryDataTree(
  selection: BoundarySelection,
  hierarchy: BoundaryHierarchy | undefined,
  countryCode = "INDIA",
): BoundaryDataNode {
  const pruned = pruneBoundarySelection(selection, hierarchy);
  const districtParent = parentOf(hierarchy?.districts);
  const blockParent = parentOf(hierarchy?.blocks);

  const blocksByDistrict = new Map<string, string[]>();
  for (const block of pruned.blocks) {
    const district = blockParent.get(block) ?? "";
    blocksByDistrict.set(district, [...(blocksByDistrict.get(district) ?? []), block]);
  }
  const districtsByState = new Map<string, string[]>();
  for (const district of pruned.districts) {
    if (!blocksByDistrict.has(district)) continue;
    const state = districtParent.get(district) ?? "";
    districtsByState.set(state, [...(districtsByState.get(state) ?? []), district]);
  }

  return {
    boundaryCode: countryCode,
    type: "country",
    name: countryCode,
    children: pruned.states
      .filter((state) => districtsByState.has(state))
      .map((state) => ({
        boundaryCode: state,
        type: "state" as const,
        name: state,
        children: (districtsByState.get(state) ?? []).map((district) => ({
          boundaryCode: district,
          type: "district" as const,
          name: district,
          children: (blocksByDistrict.get(district) ?? []).map((block) => ({
            boundaryCode: block,
            type: "block" as const,
            name: block,
          })),
        })),
      })),
  };
}
