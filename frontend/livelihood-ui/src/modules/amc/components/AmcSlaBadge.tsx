import type { AmcReportStatus } from "../types/amc-report";
import { amcSlaState } from "../utils/sla";

const TONE_CLASS = {
  ok: "livelihood-sla-badge",
  warning: "livelihood-sla-badge-warning",
  breached: "livelihood-sla-badge-urgent",
} as const;

interface AmcSlaBadgeProps {
  latestSubmissionDate: number;
  status: AmcReportStatus;
  now?: number;
}

/** Remaining review days; only meaningful while a report waits in Pending Approval. A breach is
 *  shown by the red tone and the zero/negative count alone (no text label, per client). */
export function AmcSlaBadge({ latestSubmissionDate, status, now }: Readonly<AmcSlaBadgeProps>) {
  if (status !== "PENDING_APPROVAL") {
    return <span className="livelihood-sla-badge-muted">-</span>;
  }

  const sla = amcSlaState(latestSubmissionDate, now);
  return <span className={TONE_CLASS[sla.tone]}>{sla.remainingDays}</span>;
}
