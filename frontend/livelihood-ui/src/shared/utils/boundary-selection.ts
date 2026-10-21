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

/** Codes of every node in `nodes` whose parent is `parentCode`. */
function childrenOf(nodes: BoundaryHierarchy["districts"], parentCode: string): string[] {
  return (nodes ?? []).filter((node) => node.parentCode === parentCode).map((node) => node.code);
}

/**
 * The selection as the nested `boundary_data` tree. `name` carries the code: the server
 * resolves display names itself.
 *
 * Picking a level means "all of it": a state with no district picked under it expands to every
 * district in that state, and a district with no block picked expands to every block in it. So
 * selecting only a state yields that whole state, which is what makes the template downloadable
 * before any district or block is chosen. Narrowing by district or block is a refinement, not a
 * requirement.
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
    const state = districtParent.get(district) ?? "";
    districtsByState.set(state, [...(districtsByState.get(state) ?? []), district]);
  }

  return {
    boundaryCode: countryCode,
    type: "country",
    name: countryCode,
    children: pruned.states.map((state) => ({
      boundaryCode: state,
      type: "state" as const,
      name: state,
      children: (districtsByState.get(state) ?? childrenOf(hierarchy?.districts, state)).map(
        (district) => ({
          boundaryCode: district,
          type: "district" as const,
          name: district,
          children: (blocksByDistrict.get(district) ?? childrenOf(hierarchy?.blocks, district)).map(
            (block) => ({
              boundaryCode: block,
              type: "block" as const,
              name: block,
            }),
          ),
        }),
      ),
    })),
  };
}
