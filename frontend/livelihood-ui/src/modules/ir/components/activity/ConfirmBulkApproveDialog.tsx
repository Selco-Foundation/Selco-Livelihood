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
  isAllSelected: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Shown for every bulk-approve — both the "select all" case and an explicit
 * multi-select — since approve is irreversible (see AGENTS.md's "Confirming
 * irreversible actions"). The count is plain text concatenated around
 * translated fragments rather than interpolated through `t()`: `translateOr`
 * has no interpolation support and nothing else in this codebase needs one,
 * so it's not worth extending shared i18n infra for this one dialog. */
export function ConfirmBulkApproveDialog({
  open,
  count,
  isAllSelected,
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
            {isAllSelected
              ? translateOr(t, "ES_IR_CONFIRM_BULK_APPROVE_TITLE", "Approve all matching activities?")
              : translateOr(t, "ES_IR_CONFIRM_APPROVE_SELECTED_TITLE", "Approve selected activities?")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isAllSelected ? (
              <>
                {translateOr(t, "ES_IR_CONFIRM_BULK_APPROVE_DESCRIPTION_PREFIX", "This will approve all")}{" "}
                {count}{" "}
                {translateOr(
                  t,
                  "ES_IR_CONFIRM_BULK_APPROVE_DESCRIPTION_SUFFIX",
                  "activities matching your current filters, not just the ones shown on this page. This action cannot be reversed.",
                )}
              </>
            ) : (
              <>
                {translateOr(t, "ES_IR_CONFIRM_APPROVE_SELECTED_DESCRIPTION_PREFIX", "This will approve the")}{" "}
                {count}{" "}
                {translateOr(
                  t,
                  "ES_IR_CONFIRM_APPROVE_SELECTED_DESCRIPTION_SUFFIX",
                  "selected activities. This action cannot be reversed.",
                )}
              </>
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
