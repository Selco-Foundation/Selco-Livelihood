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

/** Every field `BoundaryForm` collects. */
export interface BoundaryFormValues {
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
