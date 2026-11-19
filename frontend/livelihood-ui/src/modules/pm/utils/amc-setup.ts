import type { AmcConfigurationCreate, RawAmcConfiguration } from "../types/amc";

/** What the PM chooses for one solar asset: AMC on or off, and the AMC field staff when on. */
export interface AmcRowSetup {
  applicable: boolean;
  fieldStaffId?: string;
  fieldStaffName?: string;
}

/**
 * AMC choices per solar asset, keyed by `amcApplicableKey`. Kept apart from the technician
 * assignment entries on purpose: those are sent to the vendor-assignment API as-is.
 */
export type AmcSetupValue = Record<string, AmcRowSetup>;

export interface AmcRowRef {
  facilityId: string;
  componentType: "SOLAR" | "MACHINE";
  componentSequence: number;
}

type SiteRef = Pick<AmcRowRef, "facilityId" | "componentSequence">;

export function amcApplicableKey(row: SiteRef): string {
  return `${row.facilityId}:SOLAR:${row.componentSequence}`;
}

export function isAmcApplicable(value: AmcSetupValue, row: SiteRef): boolean {
  return Boolean(value[amcApplicableKey(row)]?.applicable);
}

/** Turns one row on or off. Turning it off drops the field staff picked so far. */
export function withAmcApplicable(value: AmcSetupValue, row: SiteRef, applicable: boolean): AmcSetupValue {
  const key = amcApplicableKey(row);
  return { ...value, [key]: applicable ? { ...value[key], applicable: true } : { applicable: false } };
}

/** Sets every solar row of the plan (not only the visible page) on or off. */
export function withAmcApplicableForAll(value: AmcSetupValue, rows: AmcRowRef[], applicable: boolean): AmcSetupValue {
  return rows
    .filter((row) => row.componentType === "SOLAR")
    .reduce((next, row) => withAmcApplicable(next, row, applicable), value);
}

export function withAmcFieldStaff(value: AmcSetupValue, row: SiteRef, fieldStaff: { id?: string; name?: string }): AmcSetupValue {
  const key = amcApplicableKey(row);
  return { ...value, [key]: { applicable: true, fieldStaffId: fieldStaff.id, fieldStaffName: fieldStaff.name } };
}

/** Solar rows with AMC on but no field staff yet: the backend refuses an AMC without one. */
export function rowsMissingFieldStaff<T extends AmcRowRef>(value: AmcSetupValue, rows: T[]): T[] {
  return rows.filter(
    (row) => row.componentType === "SOLAR" && isAmcApplicable(value, row) && !value[amcApplicableKey(row)]?.fieldStaffId,
  );
}

/** The running AMC of each SOLAR site of a plan, keyed by the site's `facilityId`. */
export function toAmcBySite(
  facilities: { activityFacility: { id: string; facilityId?: string } }[],
  amcs: RawAmcConfiguration[],
): Record<string, RawAmcConfiguration> {
  const facilityIdByActivityId = new Map(facilities.map((row) => [row.activityFacility.id, row.activityFacility.facilityId]));
  return Object.fromEntries(
    amcs.flatMap((amc) => {
      const facilityId = facilityIdByActivityId.get(amc.activityFacilityId);
      return facilityId ? [[facilityId, amc]] : [];
    }),
  );
}

/** What the PM chose for one site: who looks after its AMC, in which vendor organisation. */
export interface AmcChoice {
  facilityId: string;
  vendorOrgId: string;
  fieldStaffId: string;
  frequencyMonths?: number;
  years?: number;
}

/** The sites with AMC on, a field staff picked, and a vendor organisation on their solar row. */
export function toAmcChoices(
  value: AmcSetupValue,
  rows: AmcRowRef[],
  assignments: { facilityId: string; componentType: string; vendorOrgId?: string }[],
): AmcChoice[] {
  return rows.flatMap((row) => {
    const setup = value[amcApplicableKey(row)];
    const vendorOrgId = assignments.find(
      (entry) => entry.facilityId === row.facilityId && entry.componentType === "SOLAR",
    )?.vendorOrgId;
    if (row.componentType !== "SOLAR" || !setup?.applicable || !setup.fieldStaffId || !vendorOrgId) return [];
    return [{ facilityId: row.facilityId, vendorOrgId, fieldStaffId: setup.fieldStaffId }];
  });
}

/** An installation approved by QC: its AMC needs a start date. */
const APPROVED_INSTALLATION_STATUS = "APPROVED_BY_QC_SPOC";

/** The MDMS `isDefault` frequency and duration, used for a site whose choice names none. */
export interface AmcDefaults {
  frequencyMonths?: number;
  years?: number;
}

/**
 * The `_create` rows for the chosen sites. A choice without frequency or years takes `defaults`
 * (Edit AMC changes them later); throws when neither is known. An approved installation also gets a start date: `startDate` (today), which is
 * never before its approval day.
 */
export function toAmcCreateRows(
  facilities: { activityFacility: { id: string; facilityId?: string; status?: string } }[],
  choices: AmcChoice[],
  tenantId: string,
  startDate: number,
  defaults: AmcDefaults = {},
): AmcConfigurationCreate[] {
  return choices.flatMap((choice) => {
    const facility = facilities.find((row) => row.activityFacility.facilityId === choice.facilityId)?.activityFacility;
    if (!facility) return [];
    const frequencyMonths = choice.frequencyMonths ?? defaults.frequencyMonths;
    const years = choice.years ?? defaults.years;
    if (frequencyMonths === undefined || years === undefined) {
      throw new Error("No default AMC frequency or duration is configured");
    }
    return [
      {
        tenantId,
        activityFacilityId: facility.id,
        visitFrequencyMonths: frequencyMonths,
        durationMonths: years * 12,
        vendorOrgId: choice.vendorOrgId,
        amcFieldStaffId: choice.fieldStaffId,
        ...(facility.status === APPROVED_INSTALLATION_STATUS ? { configurationStartDate: startDate } : {}),
      },
    ];
  });
}
