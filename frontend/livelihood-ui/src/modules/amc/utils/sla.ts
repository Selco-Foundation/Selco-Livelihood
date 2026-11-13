// 7 calendar days per PRD 5.5.4. Moves to MDMS with the other AMC tunables (03-lld.md §3a).
export const AMC_REVIEW_SLA_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type AmcSlaTone = "ok" | "warning" | "breached";

export interface AmcSlaState {
  remainingDays: number;
  tone: AmcSlaTone;
  breached: boolean;
}

function startOfDay(epochMs: number): number {
  const date = new Date(epochMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Remaining review days, counted in calendar days from the report's latest submission.
 * Day 1-4 of the SLA show 7..4 (green), days 5-7 show 3..1 (yellow), and from day 8 the count is
 * 0 or negative (red; the badge shows only the number). The PRD does not say where 0 falls; treating it as breached
 * is a prototype choice to confirm with the client.
 */
export function amcSlaState(latestSubmissionDate: number, now: number = Date.now(), slaDays = AMC_REVIEW_SLA_DAYS): AmcSlaState {
  const elapsedDays = Math.round((startOfDay(now) - startOfDay(latestSubmissionDate)) / DAY_MS);
  const remainingDays = slaDays - elapsedDays;
  const breached = remainingDays <= 0;
  const tone: AmcSlaTone = breached ? "breached" : remainingDays <= 3 ? "warning" : "ok";
  return { remainingDays, tone, breached };
}
