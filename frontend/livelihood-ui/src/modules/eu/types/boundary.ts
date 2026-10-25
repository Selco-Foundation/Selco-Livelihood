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

/** Which LGD tier `lgdBlockCode` comes from - a Development Block, a Sub-district, or a name
 *  that is both. Same values the LGD onboarding stores in `boundary.lgd_block_tier`. */
export type LgdBlockTier = "Block" | "Sub-district" | "Both";

export const LGD_BLOCK_TIERS: LgdBlockTier[] = ["Block", "Sub-district", "Both"];

/** Local Government Directory codes. All optional; digits only. */
export interface LgdCodes {
  lgdStateCode: string;
  lgdDistrictCode: string;
  lgdBlockCode: string;
  lgdBlockTier: LgdBlockTier;
}

/** Every field `BoundaryForm` collects. */
export interface BoundaryFormValues extends LgdCodes {
  state: string;
  district: string;
  block: string;
}

export interface IngestUploadResult {
  /** `true` when no row failed (`errorCount === 0`) — rows already existing don't count as a failure. */
  success: boolean;
  errorCount: number;
  /** Rows that were already fully present (boundary + relationship) and needed no action — not a failure. */
  duplicateCount: number;
  /** The backend always returns this annotated workbook, success or not — per-row status/error detail. */
  resultFile: { blob: Blob; filename: string };
}
