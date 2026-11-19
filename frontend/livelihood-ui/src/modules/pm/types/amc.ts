export type AmcConfigurationStatus = "PENDING_ACTIVATION" | "ACTIVE" | "COMPLETED" | "CANCELLED";

/** One AMC as `/asset-amc/v1/configuration/_search` returns it (only the fields the PM screens read). */
export interface RawAmcConfiguration {
  id: string;
  tenantId?: string;
  status: AmcConfigurationStatus;
  activityFacilityId: string;
  visitFrequencyMonths?: number | null;
  durationMonths?: number | null;
  configurationStartDate?: number | null;
  configurationEndDate?: number | null;
  endUserName?: string | null;
  endUserPhone?: string | null;
  state?: string | null;
  district?: string | null;
  block?: string | null;
  /** Approval date of the installation report; null until it is approved. */
  installationApprovedDate?: number | null;
  vendorId?: string | null;
  vendorName?: string | null;
  fieldStaff?: { uuid: string; name?: string | null; mobile?: string | null } | null;
}

export interface AmcConfigurationSearchResponse {
  AmcConfigurations?: RawAmcConfiguration[];
  TotalCount?: number;
}

/** The minimal body per row of `/asset-amc/v1/configuration/_update`. */
export interface AmcConfigurationUpdate {
  tenantId: string;
  id: string;
  visitFrequencyMonths: number;
  durationMonths: number;
  /** Sent only when the PM changed it; the server refuses it on a pending AMC or after visit 1. */
  configurationStartDate?: number;
}

export interface AmcScheduleRow {
  id: string;
  activityFacilityId: string;
  status: AmcConfigurationStatus;
  endUserName: string;
  phoneNumber: string;
  state: string;
  district: string;
  block: string;
  installedOn?: number;
  startDate?: number;
  frequencyMonths?: number;
  years?: number;
  vendorOrgId?: string;
  fieldStaffId?: string;
  fieldStaffName?: string;
}

/** One row of `/asset-amc/v1/configuration/field-staff/_update`. */
export interface AmcFieldStaffUpdate {
  tenantId: string;
  activityFacilityId: string;
  fieldStaffUserId: string;
}

export type AmcScheduleField = "startDate" | "frequencyMonths" | "years";

export interface AmcScheduleRowError {
  id: string;
  endUserName: string;
  missing: AmcScheduleField[];
}

/** One row of `/asset-amc/v1/configuration/_create`. The start date is sent only for an approved installation. */
export interface AmcConfigurationCreate {
  tenantId: string;
  activityFacilityId: string;
  visitFrequencyMonths: number;
  durationMonths: number;
  vendorOrgId: string;
  amcFieldStaffId: string;
  configurationStartDate?: number;
}
