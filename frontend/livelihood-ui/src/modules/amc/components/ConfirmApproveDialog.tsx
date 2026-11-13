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

interface ConfirmApproveDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmApproveDialog({ open, isSubmitting, onCancel, onConfirm }: Readonly<ConfirmApproveDialogProps>) {
  const { t } = useTranslate();

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{translateOr(t, "ES_AMC_CONFIRM_APPROVE_TITLE", "Approve this AMC report?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translateOr(
              t,
              "ES_AMC_CONFIRM_APPROVE_DESCRIPTION",
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
