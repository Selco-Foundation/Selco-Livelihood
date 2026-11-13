import { addMonths } from "date-fns";
import type {
  AmcScheduleField,
  AmcScheduleRow,
  AmcScheduleRowError,
  AmcScheduleSearchResponse,
  RawAmcSchedule,
} from "../types/amc";

export function toAmcScheduleRows(response: AmcScheduleSearchResponse | undefined): AmcScheduleRow[] {
  return (response?.AmcSchedules ?? []).map((schedule) => ({
    id: schedule.id,
    facilityId: schedule.facilityId,
    endUserName: schedule.endUser.name,
    phoneNumber: schedule.endUser.mobileNumber,
    state: schedule.boundary.state,
    district: schedule.boundary.district,
    block: schedule.boundary.block,
    installedOn: schedule.installationReportFirstSubmissionDate ?? undefined,
    // A start date is only meaningful once the site is installed (Pending Activation before that),
    // so one stored against a not-installed site is ignored.
    startDate:
      schedule.installationReportFirstSubmissionDate === null ? undefined : (schedule.configurationStartDate ?? undefined),
    frequencyMonths: schedule.visitFrequencyMonths ?? undefined,
    years: schedule.durationMonths ? schedule.durationMonths / 12 : undefined,
  }));
}

/** Applies the edited rows onto the raw schedules they were loaded from, for the update call. */
export function toRawAmcSchedules(original: RawAmcSchedule[], rows: AmcScheduleRow[]): RawAmcSchedule[] {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return original.map((schedule) => {
    const row = rowsById.get(schedule.id);
    if (!row) return schedule;
    return {
      ...schedule,
      configurationStartDate: row.startDate ?? null,
      visitFrequencyMonths: row.frequencyMonths ?? null,
      durationMonths: row.years ? row.years * 12 : null,
    };
  });
}

const EDITABLE_FIELDS: AmcScheduleField[] = ["startDate", "frequencyMonths", "years"];

export function isAmcScheduleDirty(original: AmcScheduleRow[], edited: AmcScheduleRow[]): boolean {
  const originalById = new Map(original.map((row) => [row.id, row]));
  return edited.some((row) => {
    const before = originalById.get(row.id);
    return !before || EDITABLE_FIELDS.some((field) => before[field] !== row[field]);
  });
}

/** PRD 5.2.2: an AMC with no start date and no installation report yet waits as Pending Activation. */
export function isPendingActivation(row: AmcScheduleRow): boolean {
  return row.startDate === undefined && row.installedOn === undefined;
}

/**
 * Frequency and duration are always required. A start date is required once the site is installed;
 * before that it may stay blank (Pending Activation). A row that fails blocks the whole save.
 */
export function validateAmcSchedules(rows: AmcScheduleRow[]): AmcScheduleRowError[] {
  return rows.flatMap((row) => {
    const missing = EDITABLE_FIELDS.filter((field) => {
      if (field === "startDate") return row.installedOn !== undefined && row.startDate === undefined;
      return row[field] === undefined;
    });
    return missing.length > 0 ? [{ id: row.id, endUserName: row.endUserName, missing }] : [];
  });
}

/** PRD 5.2.2: first scheduled AMC = start date + frequency. Later ones follow actual submissions. */
export function firstAmcDueDate(row: AmcScheduleRow): number | undefined {
  if (row.startDate === undefined || row.frequencyMonths === undefined) return undefined;
  return addMonths(new Date(row.startDate), row.frequencyMonths).getTime();
}

/** PRD 5.1: total AMC activities = years × 12 ÷ frequency in months. */
export function totalAmcActivities(row: AmcScheduleRow): number | undefined {
  if (!row.years || !row.frequencyMonths) return undefined;
  return Math.floor((row.years * 12) / row.frequencyMonths);
}
