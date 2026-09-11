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

interface ConfirmSubmitPlanDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmSubmitPlanDialog({ open, isSubmitting, onCancel, onConfirm }: ConfirmSubmitPlanDialogProps) {
  const { t } = useTranslate();

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{translateOr(t, "ES_PM_IMPORTANT_NOTE", "Important Note")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translateOr(
              t,
              "ES_PM_CONFIRM_SUBMIT_PLAN_DESCRIPTION",
              "Once this Installation Plan is submitted, you won't be able to add any new end-user sites. You can still remove an existing site, but only if no Installation Report has been submitted for it.",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} onClick={onCancel}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction disabled={isSubmitting} onClick={onConfirm}>
            {translateOr(t, "ES_PM_CONFIRM_AND_SUBMIT", "Confirm & Submit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
