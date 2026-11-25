import { translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";

interface AmcReviewActionBarProps {
  isSubmitting: boolean;
  onApprove: () => void;
  onSendForRework: () => void;
}

export function AmcReviewActionBar({ isSubmitting, onApprove, onSendForRework }: Readonly<AmcReviewActionBarProps>) {
  const { t } = useTranslate();

  return (
    <div className="flex items-center justify-end gap-3">
      <Button variant="destructive" size="sm" disabled={isSubmitting} onClick={onSendForRework}>
        {translateOr(t, "ES_AMC_SEND_FOR_REWORK", "Send for Rework")}
      </Button>
      <Button size="sm" disabled={isSubmitting} onClick={onApprove}>
        {translateOr(t, "ES_AMC_APPROVE", "Approve")}
      </Button>
    </div>
  );
}
