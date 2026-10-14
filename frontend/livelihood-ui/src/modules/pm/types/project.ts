export interface GeographyDistrict {
  code: string;
  name?: string;
  stateCode: string;
}

export interface GeographyBlock {
  code: string;
  name?: string;
  districtCode: string;
  stateCode: string;
}

export interface GeographyState {
  code: string;
  name?: string;
}

/** A project can span multiple states — confirmed live (a project with blocks across Assam,
 *  Karnataka, and Meghalaya). `name` is often absent on `states[]` entries in real responses;
 *  fall back to localization/code for display (see `resolveStateNames`). Some older records
 *  (created before this convention) instead carry a single legacy `state` object — both shapes
 *  coexist live, so readers must check both (see `resolveStateNames`). */
export interface GeographyDetails {
  states?: GeographyState[];
  /** @deprecated legacy single-state shape — still present on older real records; read via
   *  `resolveStateNames`, don't write new data in this shape. */
  state?: GeographyState;
  districts?: GeographyDistrict[];
  blocks?: GeographyBlock[];
}

export interface ProjectAdditionalDetails {
  justificationCode?: string;
  geographyDetails?: GeographyDetails;
  /** Undefined/missing means "draft" — a project only gets a real status once
   *  it's been scheduled via the workflow endpoint. */
  status?: string;
  [key: string]: unknown;
}

export interface ProjectAddress {
  id?: string;
  tenantId?: string;
  boundaryType?: string;
  boundary?: string;
}

export interface Project {
  id?: string;
  tenantId: string;
  projectNumber?: string;
  name?: string;
  /** Read-only here. The wizard doesn't collect it — `project`'s create validation never requires
   *  it, and its MDMS value check is skipped when blank — but `_search` still returns it for
   *  projects created before the field was dropped, and `_update` preserves whatever the row
   *  already had. */
  projectType?: string;
  projectSubType?: string;
  department?: string;
  description?: string;
  referenceID?: string;
  parent?: string;
  startDate?: number;
  endDate?: number;
  additionalDetails?: ProjectAdditionalDetails;
  address?: ProjectAddress;
  isDeleted?: boolean;
}

export interface ProjectSearchCriteria {
  id?: string[];
  name?: string;
  subProjectTypeId?: string;
}

/** Client-side filters for the static Project Manager list. */
export interface ProjectListFilters {
  stateCodes: string[];
  statuses: string[];
}

export interface ProjectStatusWrapper {
  project: Project;
  status?: string;
}

export interface ProjectV2SearchResult {
  projects: ProjectStatusWrapper[];
  totalCount: number;
}
