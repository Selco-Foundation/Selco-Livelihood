/** A running AMC (pending activation or active) of the ticket's asset. */
export interface AssetAmc {
  id: string;
  activityFacilityId: string;
  assetIds: string[];
  fieldStaffId?: string;
}

export interface RawFacilityAmc {
  id: string;
  status: string;
  activityFacilityId: string;
  fieldStaff?: { uuid?: string } | null;
  assetsAmc?: { assetId?: string }[] | null;
}

export interface FacilityAmcSearchResponse {
  AmcConfigurations?: RawFacilityAmc[];
}

export interface RawOrgUser {
  id?: string;
  userId?: string;
  organizationId?: string;
  user?: { name?: string; roles?: { code?: string }[] };
}

export interface OrgUserSearchResponse {
  OrgUsers?: RawOrgUser[];
}

/** One row of `/asset-amc/v1/configuration/field-staff/_update`; `vendorOrgId` moves the AMC to a new organisation. */
export interface AmcFieldStaffUpdate {
  tenantId: string;
  activityFacilityId: string;
  fieldStaffUserId: string;
  vendorOrgId: string;
}
