import { translateOr } from "../i18n/translate-or";

/** One row of the `/asset-amc/v1/configuration/field-staff/_update` response. */
export interface AmcFieldStaffResult {
  activityFacilityId: string;
  outcome?: "CHANGED" | "UNCHANGED";
  /** Open visits given to the new field staff; includes the restarted ones. */
  visitsMoved?: number;
  /** Visits whose saved report was discarded because the vendor organisation changed. */
  visitsReset?: number;
}

export interface AmcFieldStaffUpdateResponse {
  AmcFieldStaffUpdates?: AmcFieldStaffResult[];
}

/** What a field staff change did to the visits, for a toast; undefined when no visit was touched. */
export function amcFieldStaffChangeText(
  results: AmcFieldStaffResult[] | undefined,
  t: (key: string) => string,
): string | undefined {
  const sum = (field: "visitsMoved" | "visitsReset") =>
    (results ?? []).reduce((total, result) => total + (result[field] ?? 0), 0);
  const parts = [
    { count: sum("visitsMoved"), key: "ES_AMC_VISITS_MOVED", fallback: "Visits moved to the new field staff: {count}" },
    { count: sum("visitsReset"), key: "ES_AMC_VISITS_RESET", fallback: "Visits restarted, saved report discarded: {count}" },
  ];
  const lines = parts
    .filter((part) => part.count > 0)
    .map((part) => translateOr(t, part.key, part.fallback).replace("{count}", String(part.count)));
  return lines.length > 0 ? lines.join(". ") : undefined;
}

/** Whether any AMC actually changed (the server answers UNCHANGED for the same person and vendor). */
export function hasAmcFieldStaffChanged(results: AmcFieldStaffResult[] | undefined): boolean {
  return (results ?? []).some((result) => result.outcome === "CHANGED");
}

/** Shown before an active AMC moves to another vendor organisation. */
export function amcVendorChangeWarning(t: (key: string) => string): string {
  return translateOr(
    t,
    "ES_AMC_VENDOR_CHANGE_WARNING",
    "The AMC moves to another vendor. A report still waiting for the end user's code is discarded and its visit starts again. A visit sent back for rework stays with the current vendor.",
  );
}
