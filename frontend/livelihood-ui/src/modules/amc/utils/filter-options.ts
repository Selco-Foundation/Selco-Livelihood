import type { BoundaryHierarchy, BoundaryNode } from "@/shared";
import type { RawVendorOrganisation } from "../services/amc-visits";

export interface AmcFilterOption {
  code: string;
  name: string;
}

export interface AmcFilterOptions {
  vendors: AmcFilterOption[];
  states: AmcFilterOption[];
  districts: AmcFilterOption[];
  blocks: AmcFilterOption[];
}

function byParent(nodes: BoundaryNode[] | undefined, parentCodes: string[]): BoundaryNode[] {
  return (nodes ?? []).filter((node) => parentCodes.length === 0 || parentCodes.includes(node.parentCode));
}

/**
 * State, district and block options from the boundary tree, sent to the search as codes. Districts
 * follow the selected states and blocks follow the selected districts. `nameOf` turns a code into
 * its display name.
 */
export function buildGeographyOptions(
  hierarchy: BoundaryHierarchy | undefined,
  selection: { states: string[]; districts: string[] },
  nameOf: (code: string) => string,
): Pick<AmcFilterOptions, "states" | "districts" | "blocks"> {
  const toOptions = (nodes: BoundaryNode[]) =>
    nodes.map((node) => ({ code: node.code, name: nameOf(node.code) })).sort((a, b) => a.name.localeCompare(b.name));
  const districts = byParent(hierarchy?.districts, selection.states);
  const blocks = byParent(hierarchy?.blocks, selection.districts.length ? selection.districts : districts.map((node) => node.code));
  return {
    states: toOptions(hierarchy?.states ?? []),
    districts: toOptions(districts),
    blocks: toOptions(selection.states.length || selection.districts.length ? blocks : (hierarchy?.blocks ?? [])),
  };
}

/** Active vendor organisations, by id (the visit search filters by organisation id). */
export function toVendorOptions(response: { organisations?: RawVendorOrganisation[] } | undefined): AmcFilterOption[] {
  return (response?.organisations ?? [])
    .filter((org) => org.id && org.orgStatus !== "INACTIVE")
    .map((org) => ({ code: org.id!, name: org.name ?? org.id! }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Drops selected districts/blocks that no longer fit the narrowed parent selection. */
export function pruneAmcGeography<T extends { districts: string[]; blocks: string[] }>(
  filters: T,
  options: Pick<AmcFilterOptions, "districts" | "blocks">,
): T {
  const districtCodes = new Set(options.districts.map((option) => option.code));
  const blockCodes = new Set(options.blocks.map((option) => option.code));
  return {
    ...filters,
    districts: filters.districts.filter((code) => districtCodes.has(code)),
    blocks: filters.blocks.filter((code) => blockCodes.has(code)),
  };
}
