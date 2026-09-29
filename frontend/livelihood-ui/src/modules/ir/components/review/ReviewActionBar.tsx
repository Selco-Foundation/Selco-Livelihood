import { translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";

interface ReviewActionBarProps {
  hasAnyReason: boolean;
  isSubmitting: boolean;
  onApprove: () => void;
  onReject: () => void;
}

/**
 * No reason on any section -> only Approve is enabled (approves the whole
 * report). Any section with a reason -> only Reject is enabled (rejects the
 * whole report, carrying whichever reasons were entered). Never both at once.
 */
export function ReviewActionBar({
  hasAnyReason,
  isSubmitting,
  onApprove,
  onReject,
}: ReviewActionBarProps) {
  const { t } = useTranslate();

  return (
    <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
      <Button variant="outline" disabled={hasAnyReason || isSubmitting} onClick={onApprove}>
        {translateOr(t, "ES_IR_APPROVE", "Approve")}
      </Button>
      <Button
        variant="destructive"
        disabled={!hasAnyReason || isSubmitting}
        onClick={onReject}
      >
        {translateOr(t, "ES_IR_REJECT", "Reject")}
      </Button>
    </div>
  );
}
