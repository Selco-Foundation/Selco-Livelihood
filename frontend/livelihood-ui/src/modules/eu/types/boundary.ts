export interface BoundaryRow {
  countryCode: string;
  stateCode: string;
  districtCode: string;
  blockCode: string;
  code: string;
}

export interface BoundarySearchFilters {
  state: string[];
  district: string[];
  block: string[];
}

export const EMPTY_BOUNDARY_FILTERS: BoundarySearchFilters = {
  state: [],
  district: [],
  block: [],
};

/** Every field `BoundaryForm` collects — mirrors `fa`'s `BoundaryForm.js`. */
export interface BoundaryFormValues {
  state: string;
  district: string;
  block: string;
}
