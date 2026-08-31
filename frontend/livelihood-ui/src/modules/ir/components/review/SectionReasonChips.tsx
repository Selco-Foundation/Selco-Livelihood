import { X } from "lucide-react";
import type { RejectionReasonEntry } from "../../types/facility-review";

interface SectionReasonChipsProps {
  reasons: RejectionReasonEntry[];
  onEdit: (reason: RejectionReasonEntry) => void;
  onRemove: (reasonId: string) => void;
  /** Once a decision is made, reasons are shown for history but can't be
   * edited/removed — matches e4h only allowing changes while pending review. */
  readOnly?: boolean;
}

export function SectionReasonChips({
  reasons,
  onEdit,
  onRemove,
  readOnly = false,
}: SectionReasonChipsProps) {
  if (reasons.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {reasons.map((reason) => (
        <span
          key={reason.id}
          className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive"
        >
          {readOnly ? (
            <span>
              {reason.reasonLabel}
              {reason.comment ? ` — ${reason.comment}` : ""}
            </span>
          ) : (
            <button type="button" onClick={() => onEdit(reason)} className="cursor-pointer">
              {reason.reasonLabel}
              {reason.comment ? ` — ${reason.comment}` : ""}
            </button>
          )}
          {readOnly ? null : (
            <button
              type="button"
              onClick={() => onRemove(reason.id)}
              aria-label="Remove reason"
              className="cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
