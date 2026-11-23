/** A running AMC (pending activation or active) of an end user's SOLAR asset, as the admin screen needs it. */
export interface AssetAmc {
  id: string;
  activityFacilityId: string;
  assetIds: string[];
  /** Active AMCs have visits; a pending one has none yet. */
  isActive?: boolean;
  vendorOrgId?: string;
  fieldStaffId?: string;
  fieldStaffName?: string;
}

export interface RawFacilityAmc {
  id: string;
  status: string;
  vendorId?: string | null;
  activityFacilityId: string;
  fieldStaff?: { uuid?: string; name?: string | null } | null;
  assetsAmc?: { assetId?: string }[] | null;
}

export interface FacilityAmcSearchResponse {
  AmcConfigurations?: RawFacilityAmc[];
}

/** One row of `/asset-amc/v1/configuration/field-staff/_update`; `vendorOrgId` moves the AMC to a new organisation. */
export interface AmcFieldStaffUpdate {
  tenantId: string;
  activityFacilityId: string;
  fieldStaffUserId: string;
  vendorOrgId?: string;
}
