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

interface ConfirmBulkApproveDialogProps {
  open: boolean;
  count: number;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Shown before every bulk-approve — approving can't be undone, so a
 * reviewer gets one confirmation step before it happens. The count is plain
 * text concatenated around translated fragments rather than interpolated
 * through `t()`: `translateOr` has no interpolation support and nothing
 * else in this codebase needs one, so it's not worth extending shared i18n
 * infra for this one dialog. */
export function ConfirmBulkApproveDialog({
  open,
  count,
  isSubmitting,
  onCancel,
  onConfirm,
}: ConfirmBulkApproveDialogProps) {
  const { t } = useTranslate();

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {translateOr(t, "ES_IR_CONFIRM_APPROVE_SELECTED_TITLE", "Approve selected activities?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {translateOr(t, "ES_IR_CONFIRM_APPROVE_SELECTED_DESCRIPTION_PREFIX", "This will approve the")}{" "}
            {count}{" "}
            {translateOr(
              t,
              "ES_IR_CONFIRM_APPROVE_SELECTED_DESCRIPTION_SUFFIX",
              "selected activities. This action cannot be reversed.",
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
