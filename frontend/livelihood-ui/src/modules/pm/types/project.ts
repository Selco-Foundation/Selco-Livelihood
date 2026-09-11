export interface GeographyDistrict {
  code: string;
  stateCode: string;
}

export interface GeographyBlock {
  code: string;
  districtCode: string;
  stateCode: string;
}

export interface GeographyDetails {
  states?: { code: string }[];
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
  projectType: string;
  projectSubType?: string;
  department?: string;
  description?: string;
  referenceID?: string;
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
