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
