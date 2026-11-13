import { translateOr, useTranslate } from "@/shared";
import { cn } from "@/ui";
import type { AmcReportHistoryAction, AmcReportHistoryEntry } from "../types/amc-report";
import { formatAmcDate } from "../utils/date";

const ACTION_LABELS: Record<AmcReportHistoryAction, { key: string; fallback: string }> = {
  SUBMITTED: { key: "ES_AMC_HISTORY_SUBMITTED", fallback: "Submitted" },
  RESUBMITTED: { key: "ES_AMC_HISTORY_RESUBMITTED", fallback: "Resubmitted" },
  AUTO_APPROVED: { key: "ES_AMC_HISTORY_AUTO_APPROVED", fallback: "Auto-approved" },
  SENT_TO_REVIEW: { key: "ES_AMC_HISTORY_SENT_TO_REVIEW", fallback: "Sent for review" },
  APPROVED: { key: "ES_AMC_HISTORY_APPROVED", fallback: "Approved" },
  SENT_FOR_REWORK: { key: "ES_AMC_HISTORY_SENT_FOR_REWORK", fallback: "Sent for rework" },
};

interface AmcReviewHistoryProps {
  history: AmcReportHistoryEntry[];
}

/** Own timeline rather than AuditTrailTimeline, whose labels are tied to IR activity statuses. */
export function AmcReviewHistory({ history }: Readonly<AmcReviewHistoryProps>) {
  const { t } = useTranslate();

  return (
    <div className="livelihood-card space-y-4 px-6 py-5 lg:px-7">
      <h2 className="text-sm font-semibold text-ink-950">
        {translateOr(t, "ES_AMC_REVIEW_HISTORY", "Submission and review history")}
      </h2>
      <ol className="space-y-4">
        {history.map((entry, index) => {
          const label = ACTION_LABELS[entry.action];
          const isRework = entry.action === "SENT_FOR_REWORK";
          return (
            <li key={`${entry.action}-${entry.date}-${index}`} className="flex gap-3">
              <span
                className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", isRework ? "bg-destructive" : "bg-primary")}
              />
              <div className="space-y-0.5 text-sm">
                <p className={cn("font-semibold", isRework ? "text-destructive" : "text-ink-950")}>
                  {translateOr(t, label.key, label.fallback)}
                </p>
                <p className="text-muted-foreground">
                  {entry.actor} · {formatAmcDate(entry.date)}
                </p>
                {entry.comment ? <p className="text-foreground">{entry.comment}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
