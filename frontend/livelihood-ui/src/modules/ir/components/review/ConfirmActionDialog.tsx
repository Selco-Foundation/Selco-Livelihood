import { translateOr, useTranslate } from "@/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui";
import type { ReviewDecisionAction } from "../../types/facility-review";

interface ConfirmActionDialogProps {
  action: ReviewDecisionAction | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmActionDialog({
  action,
  isSubmitting,
  onCancel,
  onConfirm,
}: ConfirmActionDialogProps) {
  const { t } = useTranslate();

  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === "APPROVE"
              ? translateOr(t, "ES_IR_CONFIRM_APPROVE_TITLE", "Approve this report?")
              : translateOr(t, "ES_IR_CONFIRM_REJECT_TITLE", "Reject this report?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {translateOr(
              t,
              "ES_IR_CONFIRM_ACTION_DESCRIPTION",
              "This action cannot be reversed. Are you sure you want to continue?",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} onClick={onCancel}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction disabled={isSubmitting} onClick={onConfirm}>
            {translateOr(t, "CORE_COMMON_CONFIRM", "Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
