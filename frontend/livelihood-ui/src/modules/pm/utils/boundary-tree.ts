import type { FacilitySummary } from "@/shared/api/facility";
import type { GeographyDetails } from "../types/project";
import { resolveStates } from "./geography";

export interface BoundaryTreeNode {
  boundaryCode: string;
  type: string;
  name: string;
  tenantId?: string;
  children?: BoundaryTreeNode[];
}

/**
 * Builds the nested `boundary_data` tree `ingestion-service`'s template-download endpoints expect
 * (root -> state -> district -> block). Real boundary display names aren't resolvable from
 * `GeographyDetails` alone yet (see `use-boundary-tree.ts`'s TODO to rewire to a real
 * boundary-service + localization lookup) — using the code as the `name` is a safe stand-in since
 * the server resolves state/sector matching off `boundaryCode`, not `name` (proven: sending the
 * wrong-looking name never broke the Solution dropdown in the live test runs, only a wrong code
 * did).
 */
export function buildProjectBoundaryTree(geography: GeographyDetails, countryTenantId = "livelihood"): BoundaryTreeNode {
  const districtsByState = new Map<string, GeographyDetails["districts"]>();
  for (const district of geography.districts ?? []) {
    const list = districtsByState.get(district.stateCode) ?? [];
    list.push(district);
    districtsByState.set(district.stateCode, list);
  }

  const blocksByDistrict = new Map<string, GeographyDetails["blocks"]>();
  for (const block of geography.blocks ?? []) {
    const list = blocksByDistrict.get(block.districtCode) ?? [];
    list.push(block);
    blocksByDistrict.set(block.districtCode, list);
  }

  const stateNodes: BoundaryTreeNode[] = resolveStates(geography).map((state) => ({
    boundaryCode: state.code,
    type: "state",
    name: state.code,
    children: (districtsByState.get(state.code) ?? []).map((district) => ({
      boundaryCode: district.code,
      type: "district",
      name: district.code,
      children: (blocksByDistrict.get(district.code) ?? []).map((block) => ({
        boundaryCode: block.code,
        type: "block",
        name: block.code,
      })),
    })),
  }));

  return {
    boundaryCode: "INDIA",
    type: "country",
    name: "India",
    tenantId: countryTenantId,
    children: stateNodes,
  };
}

/**
 * Builds the `boundary_data` tree for the Installation Scope template download
 * (`fieldplanFacilityIngestionTemplate`) — unlike `buildProjectBoundaryTree`, leaves here must be
 * **facility-level** codes (`{blockCode}_{facilityId}`), because Stage 2 is restricted to
 * facilities already linked to the project (a plain block code matches nothing server-side —
 * proven trap). `facilities` should already be filtered to the plan's sector and to the project's
 * linked facility ids before calling this.
 */
export function buildScopeBoundaryTree(
  geography: GeographyDetails,
  facilities: FacilitySummary[],
  countryTenantId = "livelihood",
): BoundaryTreeNode {
  const facilitiesByBlockCode = new Map<string, FacilitySummary[]>();
  for (const facility of facilities) {
    // A facility's own boundaryCode is facility-level (`{blockCode}_{facilityId}`), not the plain
    // block code the geography's own `blocks[].code` list uses — keying the map by the raw
    // boundaryCode meant the lookup below by plain block code never matched anything, so every
    // district's children came back empty regardless of how much real data existed.
    const facilityIdSuffix = `_${facility.facilityId}`;
    const blockCode = facility.boundaryCode.endsWith(facilityIdSuffix)
      ? facility.boundaryCode.slice(0, -facilityIdSuffix.length)
      : facility.boundaryCode;
    const list = facilitiesByBlockCode.get(blockCode) ?? [];
    list.push(facility);
    facilitiesByBlockCode.set(blockCode, list);
  }

  const districtsByState = new Map<string, GeographyDetails["districts"]>();
  for (const district of geography.districts ?? []) {
    const list = districtsByState.get(district.stateCode) ?? [];
    list.push(district);
    districtsByState.set(district.stateCode, list);
  }

  const blocksByDistrict = new Map<string, GeographyDetails["blocks"]>();
  for (const block of geography.blocks ?? []) {
    const list = blocksByDistrict.get(block.districtCode) ?? [];
    list.push(block);
    blocksByDistrict.set(block.districtCode, list);
  }

  const stateNodes: BoundaryTreeNode[] = resolveStates(geography).map((state) => ({
    boundaryCode: state.code,
    type: "state",
    name: state.code,
    children: (districtsByState.get(state.code) ?? []).map((district) => ({
      boundaryCode: district.code,
      type: "district",
      name: district.code,
      children: (blocksByDistrict.get(district.code) ?? []).flatMap((block) =>
        (facilitiesByBlockCode.get(block.code) ?? []).map((facility) => ({
          boundaryCode: `${block.code}_${facility.facilityId}`,
          type: "block",
          name: facility.facilityName ?? facility.facilityId,
        })),
      ),
    })),
  }));

  return {
    boundaryCode: "INDIA",
    type: "country",
    name: "India",
    tenantId: countryTenantId,
    children: stateNodes,
  };
}
