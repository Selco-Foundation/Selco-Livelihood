import { translateOr, useTranslate } from "@/shared";
import { cn } from "@/ui";
import { FACILITY_ENTRY_STATUS_LABELS } from "../../constants/facility-status";
import type { FacilityAuditCheckpoint, FacilityEntryStatus } from "../../types/facility-review";

function statusLabel(
  status: FacilityEntryStatus,
  t: ReturnType<typeof useTranslate>["t"],
): string {
  const label = FACILITY_ENTRY_STATUS_LABELS[status];
  return translateOr(t, label.key, label.fallback);
}

interface AuditTrailTimelineProps {
  checkpoints: FacilityAuditCheckpoint[];
}

export function AuditTrailTimeline({ checkpoints }: AuditTrailTimelineProps) {
  const { t } = useTranslate();

  if (checkpoints.length === 0) {
    return null;
  }

  return (
    <div className="livelihood-card space-y-4 px-6 py-5 lg:px-7">
      <p className="text-sm font-semibold text-ink-950">
        {translateOr(t, "ES_IR_AUDIT_TRAIL", "Audit Trail")}
      </p>
      <div className="space-y-4">
        {checkpoints.map((checkpoint, index) => (
          <div key={checkpoint.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  checkpoint.status === "REJECTED_BY_QC_SPOC" ? "bg-destructive" : "bg-primary",
                )}
              />
              {index < checkpoints.length - 1 ? (
                <span className="w-px flex-1 bg-border" />
              ) : null}
            </div>
            <div className="flex-1 space-y-2 pb-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-ink-950">
                  {statusLabel(checkpoint.status, t)}
                </p>
                <p className="text-xs text-ink-600">{checkpoint.date}</p>
              </div>
              {checkpoint.sectionReasons?.map((section) => (
                <div key={section.sectionId} className="space-y-1">
                  <p className="text-xs font-semibold text-ink-600">{section.sectionLabel}</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-sm text-ink-950">
                    {section.reasons.map((reason, reasonIndex) => (
                      <li key={reasonIndex}>
                        {reason.reasonLabel}
                        {reason.comment ? ` — ${reason.comment}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
