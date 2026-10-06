export interface FacilityAsset {
  assetId: string;
  assetType: string;
  serialNumber?: string;
  modelNumber?: string;
  brand?: string;
  capacity?: string;
  installationDate?: string;
  isOperational?: boolean;
  /** The vendor currently mapped to this asset — a raw user uuid today, with
   * no resolved display name available from the asset search response yet. */
  vendorId?: string;
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
