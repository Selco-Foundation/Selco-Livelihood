import { addMonths } from "date-fns";
import type {
  AmcCompletion,
  AmcConfigurationStatus,
  AmcConfigurationUpdate,
  AmcFieldStaffUpdate,
  AmcScheduleField,
  AmcScheduleProblem,
  AmcScheduleRow,
  AmcScheduleRowError,
  AmcScheduleSource,
  RawAmcConfiguration,
} from "../types/amc";

/** Only running AMCs are edited or turned off; a completed or cancelled one is shown read-only. */
export const RUNNING_AMC_STATUSES: AmcConfigurationStatus[] = ["PENDING_ACTIVATION", "ACTIVE"];

export function isAmcRunning(row: Pick<AmcScheduleRow, "status">): boolean {
  return RUNNING_AMC_STATUSES.includes(row.status);
}

/**
 * One row per site: its running AMC, or else its completed one, so the PM still sees that the site
 * had an AMC (a new one can be started with Add AMC).
 */
function onePerSite(configurations: RawAmcConfiguration[]): RawAmcConfiguration[] {
  const rank = (amc: RawAmcConfiguration) => {
    if (isAmcRunning(amc)) return 0;
    return amc.status === "COMPLETED" ? 1 : 2;
  };
  const bySite = new Map<string, RawAmcConfiguration>();
  for (const amc of configurations) {
    const kept = bySite.get(amc.activityFacilityId);
    if (!kept || rank(amc) < rank(kept)) bySite.set(amc.activityFacilityId, amc);
  }
  return configurations.filter((amc) => bySite.get(amc.activityFacilityId) === amc);
}

export function toAmcScheduleRows(source: AmcScheduleSource | undefined): AmcScheduleRow[] {
  const submittedByAmc = new Map<string, number>();
  const approvedByAmc = new Map<string, number>();
  for (const visit of source?.visits ?? []) {
    if (visit.amcConfigurationId && visit.firstSubmissionDate) {
      submittedByAmc.set(visit.amcConfigurationId, (submittedByAmc.get(visit.amcConfigurationId) ?? 0) + 1);
      if (visit.status === "APPROVED") {
        approvedByAmc.set(visit.amcConfigurationId, (approvedByAmc.get(visit.amcConfigurationId) ?? 0) + 1);
      }
    }
  }
  return onePerSite(source?.configurations ?? [])
    .map((amc) => ({
      id: amc.id,
      activityFacilityId: amc.activityFacilityId,
      status: amc.status,
      endUserName: amc.endUserName ?? "-",
      phoneNumber: amc.endUserPhone ?? "-",
      state: amc.state ?? "-",
      district: amc.district ?? "-",
      block: amc.block ?? "-",
      installedOn: amc.installationApprovedDate ?? undefined,
      // A pending AMC has no start date yet: it starts on the day its installation report is approved.
      startDate: amc.status === "PENDING_ACTIVATION" ? undefined : (amc.configurationStartDate ?? undefined),
      frequencyMonths: amc.visitFrequencyMonths ?? undefined,
      years: amc.durationMonths ? amc.durationMonths / 12 : undefined,
      vendorOrgId: amc.vendorId ?? undefined,
      vendorName: amc.vendorName ?? undefined,
      fieldStaffId: amc.fieldStaff?.uuid,
      fieldStaffName: amc.fieldStaff?.name ?? undefined,
      submittedVisits: submittedByAmc.get(amc.id) ?? 0,
      approvedVisits: approvedByAmc.get(amc.id) ?? 0,
    }));
}

/**
 * The start date can change only on a running AMC that has started and has no submitted visit yet:
 * a pending AMC starts on its installation approval day, and the server locks the date once visit 1
 * is submitted.
 */
export function isStartDateLocked(row: AmcScheduleRow): boolean {
  return !isAmcRunning(row) || isPendingActivation(row) || row.submittedVisits > 0;
}

/**
 * The minimal `_update` body: only rows the PM changed. The start date goes with a row only when it
 * changed (the server refuses one on a pending AMC, and locks it once visit 1 is submitted).
 */
export function toAmcConfigurationUpdates(
  original: AmcScheduleRow[],
  edited: AmcScheduleRow[],
  tenantId: string,
): AmcConfigurationUpdate[] {
  const originalById = new Map(original.map((row) => [row.id, row]));
  return edited.flatMap((row) => {
    const before = originalById.get(row.id);
    if (!before || !hasChanged(before, row) || !row.frequencyMonths || !row.years) return [];
    return [
      {
        tenantId,
        id: row.id,
        visitFrequencyMonths: row.frequencyMonths,
        durationMonths: row.years * 12,
        ...(row.status === "ACTIVE" && row.startDate !== undefined && row.startDate !== before.startDate
          ? { configurationStartDate: row.startDate }
          : {}),
      },
    ];
  });
}

const EDITABLE_FIELDS: AmcScheduleField[] = ["startDate", "frequencyMonths", "years"];

function hasChanged(before: AmcScheduleRow, after: AmcScheduleRow): boolean {
  return EDITABLE_FIELDS.some((field) => before[field] !== after[field]);
}

/** The `field-staff/_update` rows: only AMCs whose field staff the PM changed. */
export function toAmcFieldStaffUpdates(
  original: AmcScheduleRow[],
  edited: AmcScheduleRow[],
  tenantId: string,
): AmcFieldStaffUpdate[] {
  const originalById = new Map(original.map((row) => [row.id, row]));
  return edited.flatMap((row) => {
    const before = originalById.get(row.id);
    if (!before || !row.fieldStaffId || row.fieldStaffId === before.fieldStaffId) return [];
    return [{ tenantId, activityFacilityId: row.activityFacilityId, fieldStaffUserId: row.fieldStaffId }];
  });
}

export function isAmcScheduleDirty(original: AmcScheduleRow[], edited: AmcScheduleRow[]): boolean {
  const originalById = new Map(original.map((row) => [row.id, row]));
  return edited.some((row) => {
    const before = originalById.get(row.id);
    return !before || hasChanged(before, row) || row.fieldStaffId !== before.fieldStaffId;
  });
}

/** A pending AMC starts by itself when its installation report is approved. */
export function isPendingActivation(row: AmcScheduleRow): boolean {
  return row.status === "PENDING_ACTIVATION";
}

/**
 * Checks every running row the way the server will, so a save is refused here first. Frequency and
 * years are required; an active AMC needs its start date (a pending one has none). The years must
 * make whole visits, and never fewer visits than are already submitted. One failing row blocks the
 * whole save.
 */
export function validateAmcSchedules(rows: AmcScheduleRow[]): AmcScheduleRowError[] {
  return rows.filter(isAmcRunning).flatMap((row) => {
    const missing = EDITABLE_FIELDS.filter((field) => {
      if (field === "startDate") return row.status === "ACTIVE" && row.startDate === undefined;
      return row[field] === undefined;
    });
    const problems: AmcScheduleProblem[] = [];
    if (row.years && row.frequencyMonths) {
      if ((row.years * 12) % row.frequencyMonths !== 0) {
        problems.push({ kind: "NOT_WHOLE_VISITS" });
      } else if ((totalAmcActivities(row) ?? 0) < row.submittedVisits) {
        problems.push({ kind: "TOTAL_BELOW_SUBMITTED", submitted: row.submittedVisits });
      }
    }
    return missing.length > 0 || problems.length > 0
      ? [{ id: row.id, endUserName: row.endUserName, missing, problems }]
      : [];
  });
}

/**
 * The edits that end an AMC: the total drops to the visits already submitted, so the server removes
 * the upcoming visit and completes the AMC, now or once its last report is approved. A completed AMC
 * can't be reopened, so the PM is asked first.
 */
export function findAmcCompletions(original: AmcScheduleRow[], edited: AmcScheduleRow[]): AmcCompletion[] {
  const originalById = new Map(original.map((row) => [row.id, row]));
  return edited.flatMap((row) => {
    const before = originalById.get(row.id);
    const total = totalAmcActivities(row);
    const totalBefore = before && totalAmcActivities(before);
    if (!isAmcRunning(row) || row.submittedVisits === 0 || total !== row.submittedVisits) return [];
    if (totalBefore !== undefined && total >= totalBefore) return [];
    return [{ id: row.id, endUserName: row.endUserName, completesNow: row.approvedVisits === row.submittedVisits }];
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
