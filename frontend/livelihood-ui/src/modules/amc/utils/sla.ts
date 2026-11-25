import type { AmcSla } from "../types/amc-report";

/** Days left at or below which the SLA badge turns yellow (MDMS `AMC.Config.slaWarningDays`, 3 on dev). */
export const AMC_SLA_WARNING_DAYS = 3;

export type AmcSlaTone = "ok" | "warning" | "breached";

/** Colour of the SLA badge. The server decides the breach; the badge only reads it. */
export function amcSlaTone(sla: AmcSla, warningDays = AMC_SLA_WARNING_DAYS): AmcSlaTone {
  if (sla.breached) return "breached";
  return sla.daysRemaining <= warningDays ? "warning" : "ok";
}
