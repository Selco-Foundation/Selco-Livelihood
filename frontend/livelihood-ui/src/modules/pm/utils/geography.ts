import type { BoundaryTreeNode } from "../services/ingestion";
import type { GeographyDetails } from "../types/project";

/** Builds the nested `boundary_data` tree the ingestion-service template
 *  endpoint expects: `flatten_boundaries` on that side only emits a row per
 *  `type: "block"` leaf, so district/state nodes with no selected blocks
 *  underneath them are still included (for the sheet's BoundaryCodes context)
 *  but contribute no rows themselves. Multiple states nest as siblings under
 *  the same country root — `flatten_boundaries` recurses every child
 *  regardless of how many state-type nodes exist at that level, so this
 *  needs no backend change. Display names are resolved via the same
 *  `BOUNDARY_<code>` localization convention used everywhere else in this
 *  app (`InboxFilter.tsx`) rather than carried alongside the codes. */
export function buildBoundaryTree(
  geography: GeographyDetails,
  resolveName: (code: string) => string,
  tenantId: string,
): BoundaryTreeNode {
  const blocksByDistrict = new Map<string, GeographyDetails["blocks"]>();
  for (const block of geography.blocks ?? []) {
    const existing = blocksByDistrict.get(block.districtCode) ?? [];
    existing.push(block);
    blocksByDistrict.set(block.districtCode, existing);
  }

  const districtsByState = new Map<string, GeographyDetails["districts"]>();
  for (const district of geography.districts ?? []) {
    const existing = districtsByState.get(district.stateCode) ?? [];
    existing.push(district);
    districtsByState.set(district.stateCode, existing);
  }

  const stateNodes: BoundaryTreeNode[] = (geography.states ?? []).map((state) => ({
    boundaryCode: state.code,
    type: "state",
    name: resolveName(state.code),
    tenantId,
    children: (districtsByState.get(state.code) ?? []).map((district) => ({
      boundaryCode: district.code,
      type: "district",
      name: resolveName(district.code),
      tenantId,
      children: (blocksByDistrict.get(district.code) ?? []).map((block) => ({
        boundaryCode: block.code,
        type: "block",
        name: resolveName(block.code),
        tenantId,
      })),
    })),
  }));

  return {
    boundaryCode: "India",
    type: "country",
    name: "India",
    tenantId,
    children: stateNodes,
  };
}
