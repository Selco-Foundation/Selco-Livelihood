export interface FacilityAsset {
  assetId: string;
  assetType: string;
  serialNumber?: string;
  modelNumber?: string;
  brand?: string;
  capacity?: string;
  installationDate?: string;
  isOperational?: boolean;
  /** The vendor user uuid currently mapped to this asset — the only thing
   * actually persisted; `vendor` below is a read-time enrichment of it. */
  vendorId?: string;
  /** The resolved org/vendor-user this asset's `vendorId` currently points
   * at, as the asset search response enriches it — used to seed the
   * Organization/Vendor dropdowns' pinned option before either has loaded
   * the page containing it. */
  vendor?: {
    userId?: string;
    name?: string;
    organisationId?: string;
    organisationName?: string;
  };
  /** Populated only on a top-level family asset (e.g. a SOLAR system) —
   * its own unit assets (Panel/Battery/Inverter). */
  children?: FacilityAsset[];
}

export interface AssetFilters {
  assetType: string[];
  isOperational: string[];
  serialNumber: string[];
  // Index signature so this satisfies CategoryFilterPopover's generic
  // `Record<string, string[]>` selected-state prop without a cast.
  [key: string]: string[];
}

export const EMPTY_ASSET_FILTERS: AssetFilters = {
  assetType: [],
  isOperational: [],
  serialNumber: [],
};
