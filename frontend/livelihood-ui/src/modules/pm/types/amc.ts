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
  vendorName?: string;
  fieldStaffId?: string;
  fieldStaffName?: string;
  /** Visits of this AMC already submitted at least once: they lock the start date and set the minimum total. */
  submittedVisits: number;
}

/** One visit as `/asset-amc/v1/visit/_search` returns it (only what Edit AMC reads). */
export interface RawAmcVisitSummary {
  id: string;
  amcConfigurationId?: string;
  status?: string;
  firstSubmissionDate?: number | null;
}

export interface AmcVisitSearchResponse {
  ScheduledVisits?: RawAmcVisitSummary[];
  TotalCount?: number;
}

/** What Edit AMC is built from: the plan's AMCs and the visits of the running ones. */
export interface AmcScheduleSource {
  configurations: RawAmcConfiguration[];
  visits: RawAmcVisitSummary[];
}

/** One row of `/asset-amc/v1/configuration/field-staff/_update`. */
export interface AmcFieldStaffUpdate {
  tenantId: string;
  activityFacilityId: string;
  fieldStaffUserId: string;
}

export type AmcScheduleField = "startDate" | "frequencyMonths" | "years";

/** A rule the server would refuse a row for, caught before saving. */
export type AmcScheduleProblem =
  | { kind: "TOTAL_BELOW_SUBMITTED"; submitted: number }
  | { kind: "NOT_WHOLE_VISITS" };

export interface AmcScheduleRowError {
  id: string;
  endUserName: string;
  missing: AmcScheduleField[];
  problems: AmcScheduleProblem[];
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
