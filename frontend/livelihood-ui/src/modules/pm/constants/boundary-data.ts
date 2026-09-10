export interface BoundaryOption {
  code: string;
  name: string;
}

export interface DistrictOption extends BoundaryOption {
  stateCode: string;
}

export interface BlockOption extends BoundaryOption {
  districtCode: string;
  stateCode: string;
}

export interface BoundaryHierarchy {
  states: BoundaryOption[];
  districts: DistrictOption[];
  blocks: BlockOption[];
}

// Mock `boundary-service` hierarchy (state -> district -> block) — no real
// endpoint wired up yet; hardcoded per project convention until the real
// `boundary-relationships/v2/_search` integration is done (see
// src/shared/api/boundary.ts's `fetchBoundaryRelations` for the pattern a
// real implementation would follow).
export const MOCK_BOUNDARY_HIERARCHY: BoundaryHierarchy = {
  states: [
    { code: "KA", name: "Karnataka" },
    { code: "TN", name: "Tamil Nadu" },
  ],
  districts: [
    { code: "BLR", name: "Bengaluru Urban", stateCode: "KA" },
    { code: "MYS", name: "Mysuru", stateCode: "KA" },
    { code: "CHN", name: "Chennai", stateCode: "TN" },
    { code: "CBE", name: "Coimbatore", stateCode: "TN" },
  ],
  blocks: [
    { code: "BLR_EAST", name: "Bengaluru East", districtCode: "BLR", stateCode: "KA" },
    { code: "BLR_SOUTH", name: "Bengaluru South", districtCode: "BLR", stateCode: "KA" },
    { code: "MYS_NORTH", name: "Mysuru North", districtCode: "MYS", stateCode: "KA" },
    { code: "CHN_CENTRAL", name: "Chennai Central", districtCode: "CHN", stateCode: "TN" },
    { code: "CBE_SOUTH", name: "Coimbatore South", districtCode: "CBE", stateCode: "TN" },
  ],
};
