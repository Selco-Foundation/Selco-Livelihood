/** One end user's AMC schedule as the AMC service will return it (`amc_configuration`-shaped). */
export interface RawAmcSchedule {
  id: string;
  fieldPlanId: string;
  facilityId: string;
  endUser: { name: string; mobileNumber: string };
  boundary: { state: string; district: string; block: string };
  componentType: "SOLAR";
  /** Installation report first submission date; null until the site is installed (AMC Pending Activation). */
  installationReportFirstSubmissionDate: number | null;
  configurationStartDate: number | null;
  visitFrequencyMonths: number | null;
  durationMonths: number | null;
}

export interface AmcScheduleSearchResponse {
  AmcSchedules: RawAmcSchedule[];
}

export interface AmcScheduleRow {
  id: string;
  facilityId: string;
  endUserName: string;
  phoneNumber: string;
  state: string;
  district: string;
  block: string;
  installedOn?: number;
  startDate?: number;
  frequencyMonths?: number;
  years?: number;
}

export type AmcScheduleField = "startDate" | "frequencyMonths" | "years";

export interface AmcScheduleRowError {
  id: string;
  endUserName: string;
  missing: AmcScheduleField[];
}
