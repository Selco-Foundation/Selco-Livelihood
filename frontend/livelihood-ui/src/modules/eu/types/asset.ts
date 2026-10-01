export interface FacilityAsset {
  assetId: string;
  assetType: string;
  serialNumber?: string;
  modelNumber?: string;
  brand?: string;
  capacity?: string;
  installationDate?: string;
  isOperational?: boolean;
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
