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

interface ConfirmSubmitProjectDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Final acknowledgement before scheduling a fully configured project. */
export function ConfirmSubmitProjectDialog({
  open,
  isSubmitting,
  onCancel,
  onConfirm,
}: ConfirmSubmitProjectDialogProps) {
  const { t } = useTranslate();

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{translateOr(t, "ES_PM_IMPORTANT_NOTE", "Important Note")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translateOr(
              t,
              "ES_PM_CONFIRM_SUBMIT_PROJECT_DESCRIPTION",
              "Once this project is submitted, its end-user data will be finalized and the project will become active.",
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
