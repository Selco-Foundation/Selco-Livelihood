export interface Facility {
  id: string;
  facilityName?: string;
  facilityCategory?: string;
  facilityType?: string;
  isActive?: boolean;
  isOnmReady?: boolean;
  pocName?: string;
  pocUsername?: string;
  pocPhone?: string;
  pocEmail?: string;
  /**
   * The facility's own leaf boundary code (e.g. `INDIA_STATE_DISTRICT_BLOCK_ED/2026/0098`)
   * — confirmed against the real `facility-service` response, whose `_bulk-search`
   * doesn't populate a resolved `boundary.{state,district,block}` object (unlike
   * `fa`'s legacy assumption). State/district/block names are derived from this
   * code by walking the boundary hierarchy tree's parent chain (see
   * `utils/boundary.ts`'s `resolveBoundaryLabels`), same as `shared/api/facility.ts`.
   */
  boundaryCode?: string;
  latitude?: number;
  longitude?: number;
  solarSolutionDesignType?: string;
}

export interface FacilitySearchFilters {
  state: string[];
  district: string[];
  block: string[];
  facility: string[];
}

export const EMPTY_FACILITY_FILTERS: FacilitySearchFilters = {
  state: [],
  district: [],
  block: [],
  facility: [],
};

/** Every field `FacilityForm` collects — mirrors `fa`'s `FacilityForm.js` config minus the HEALTH-category branch (HFR ID / NIN ID / POC-username exemption). */
export interface FacilityFormValues {
  state: string;
  district: string;
  block: string;
  facilityName: string;
  facilityCategory: string;
  facilityType: string;
  solarSolutionDesignType: string;
  pocName: string;
  pocUsername: string;
  pocPhone: string;
  pocEmail: string;
  isOperational: boolean;
  isOnmReady: boolean;
  latitude: string;
  longitude: string;
}
