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
  /** The facility's own leaf boundary code (e.g. `INDIA_STATE_DISTRICT_BLOCK_ED/2026/0098`). */
  boundaryCode?: string;
  /** State/district/block boundary codes the backend resolves server-side from `boundaryCode`; absent when the backend couldn't resolve it. */
  stateCode?: string;
  districtCode?: string;
  blockCode?: string;
  latitude?: number;
  longitude?: number;
  endUserType?: string;
  /** The untransformed backend record — the update call spreads this first and
   * overrides only the edited fields, since `/facility-service/v2/facility/update`
   * replaces the whole record rather than patching it. */
  raw?: Record<string, unknown>;
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

/** Every field `FacilityForm` collects. HEALTH-category facilities (HFR ID / NIN ID / username exemption) aren't supported here. */
export interface FacilityFormValues {
  state: string;
  district: string;
  block: string;
  /** Sent as both `facility_name` and `facility_poc_name` on save — the end user's own name doubles as the site name. */
  endUserName: string;
  facilityCategory: string;
  facilityType: string;
  endUserType: string;
  endUserUsername: string;
  endUserPhone: string;
  endUserEmail: string;
  isOperational: boolean;
  isOnmReady: boolean;
  latitude: string;
  longitude: string;
  /** Optional — the backend auto-generates a password when none is sent. */
  password: string;
  confirmPassword: string;
}
