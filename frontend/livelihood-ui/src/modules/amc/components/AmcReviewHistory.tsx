import { translateOr, useTranslate } from "@/shared";
import { cn } from "@/ui";
import type { AmcReportHistoryEntry } from "../types/amc-report";
import { formatAmcDate } from "../utils/date";

// Workflow actions of an AMC visit (AMC business service). An unknown action shows as its code.
const ACTION_LABELS: Record<string, { key: string; fallback: string }> = {
  SCHEDULE: { key: "ES_AMC_HISTORY_SCHEDULED", fallback: "Visit scheduled" },
  SUBMIT_VISIT_REPORT: { key: "ES_AMC_HISTORY_SUBMITTED", fallback: "Report submitted" },
  SUBMIT_OTP: { key: "ES_AMC_HISTORY_CODE_VERIFIED", fallback: "Service code verified" },
  AUTO_APPROVE: { key: "ES_AMC_HISTORY_AUTO_APPROVED", fallback: "Auto-approved" },
  APPROVE: { key: "ES_AMC_HISTORY_APPROVED", fallback: "Approved" },
  REJECT: { key: "ES_AMC_HISTORY_SENT_FOR_REWORK", fallback: "Sent for rework" },
  RESET_FOR_REASSIGNMENT: { key: "ES_AMC_HISTORY_REASSIGNED", fallback: "Moved to a new field staff" },
};

interface AmcReviewHistoryProps {
  history: AmcReportHistoryEntry[];
  /** Display name of a rework reason code (MDMS `AMC.RejectionReasons`). */
  reasonName: (code: string) => string;
}

/** Own timeline rather than AuditTrailTimeline, whose labels are tied to IR activity statuses. */
export function AmcReviewHistory({ history, reasonName }: Readonly<AmcReviewHistoryProps>) {
  const { t } = useTranslate();

  if (history.length === 0) return null;

  return (
    <div className="livelihood-card space-y-4 px-6 py-5 lg:px-7">
      <h2 className="text-sm font-semibold text-ink-950">
        {translateOr(t, "ES_AMC_REVIEW_HISTORY", "Submission and review history")}
      </h2>
      <ol className="space-y-4">
        {history.map((entry, index) => {
          const label = ACTION_LABELS[entry.action];
          const isRework = entry.action === "REJECT";
          return (
            <li key={`${entry.action}-${entry.date ?? index}-${index}`} className="flex gap-3">
              <span
                className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", isRework ? "bg-destructive" : "bg-primary")}
              />
              <div className="space-y-0.5 text-sm">
                <p className={cn("font-semibold", isRework ? "text-destructive" : "text-ink-950")}>
                  {label ? translateOr(t, label.key, label.fallback) : entry.action}
                </p>
                <p className="text-muted-foreground">
                  {entry.actor} · {formatAmcDate(entry.date)}
                </p>
                {entry.reasons.length > 0 ? (
                  <ul className="list-disc space-y-0.5 pl-5 text-foreground">
                    {entry.reasons.map((reason, reasonIndex) => (
                      <li key={`${reason.code}-${reasonIndex}`}>
                        {reasonName(reason.code)}
                        {reason.comment ? `: ${reason.comment}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {entry.comment ? <p className="text-foreground">{entry.comment}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
