import { addMonths } from "date-fns";
import type {
  AmcConfigurationSearchResponse,
  AmcConfigurationUpdate,
  AmcFieldStaffUpdate,
  AmcScheduleField,
  AmcScheduleRow,
  AmcScheduleRowError,
} from "../types/amc";

/** Only running AMCs are edited; a completed or cancelled one has nothing left to change. */
const EDITABLE_STATUSES = new Set(["PENDING_ACTIVATION", "ACTIVE"]);

export function toAmcScheduleRows(response: AmcConfigurationSearchResponse | undefined): AmcScheduleRow[] {
  return (response?.AmcConfigurations ?? [])
    .filter((amc) => EDITABLE_STATUSES.has(amc.status))
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
      startDate: amc.status === "ACTIVE" ? (amc.configurationStartDate ?? undefined) : undefined,
      frequencyMonths: amc.visitFrequencyMonths ?? undefined,
      years: amc.durationMonths ? amc.durationMonths / 12 : undefined,
      vendorOrgId: amc.vendorId ?? undefined,
      fieldStaffId: amc.fieldStaff?.uuid,
      fieldStaffName: amc.fieldStaff?.name ?? undefined,
    }));
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
 * Frequency and years are always required. A running AMC always has a start date, so clearing it
 * is an error. A pending AMC has none. A row that fails blocks the whole save.
 */
export function validateAmcSchedules(rows: AmcScheduleRow[]): AmcScheduleRowError[] {
  return rows.flatMap((row) => {
    const missing = EDITABLE_FIELDS.filter((field) => {
      if (field === "startDate") return row.status === "ACTIVE" && row.startDate === undefined;
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
