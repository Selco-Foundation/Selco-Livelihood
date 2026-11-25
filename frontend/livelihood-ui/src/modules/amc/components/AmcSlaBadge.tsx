import type { AmcSla } from "../types/amc-report";
import { amcSlaTone } from "../utils/sla";

const TONE_CLASS = {
  ok: "livelihood-sla-badge",
  warning: "livelihood-sla-badge-warning",
  breached: "livelihood-sla-badge-urgent",
} as const;

/** Review days left, from the server; only set while a report waits for review. A breach is shown
 *  by the red tone and the zero/negative count alone (no text label, per client). */
export function AmcSlaBadge({ sla }: Readonly<{ sla?: AmcSla }>) {
  if (!sla) {
    return <span className="livelihood-sla-badge-muted">-</span>;
  }
  return <span className={TONE_CLASS[amcSlaTone(sla)]}>{sla.daysRemaining}</span>;
}
