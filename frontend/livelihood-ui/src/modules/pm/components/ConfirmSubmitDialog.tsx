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

interface ConfirmSubmitDialogProps {
  open: boolean;
  isSubmitting: boolean;
  errorMessage?: string;
  /** What becomes irreversible on confirm — the only thing that differs between the
   *  project and installation-plan uses of this dialog. */
  descriptionKey: string;
  descriptionFallback: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Final acknowledgement before an irreversible submit (scheduling a project, publishing an
 *  installation plan). */
export function ConfirmSubmitDialog({
  open,
  isSubmitting,
  errorMessage,
  descriptionKey,
  descriptionFallback,
  onCancel,
  onConfirm,
}: Readonly<ConfirmSubmitDialogProps>) {
  const { t } = useTranslate();

  return (
    // Close requests are refused while the submit is in flight -- Escape and the overlay included.
    // The caller closes the dialog itself once the work succeeds; until then this has to stay up
    // to show its own error.
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{translateOr(t, "ES_PM_IMPORTANT_NOTE", "Important Note")}</AlertDialogTitle>
          <AlertDialogDescription>{translateOr(t, descriptionKey, descriptionFallback)}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* whitespace-pre-line so the newline-joined per-row messages from the pre-publish
            vendor-assignment validation render as separate lines, not one run-on string. */}
        {errorMessage ? <p className="text-sm whitespace-pre-line text-destructive">{errorMessage}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} onClick={onCancel}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            // AlertDialogAction is a Radix close button, and its own handler runs after this one,
            // so without preventDefault the dialog unmounts the instant Confirm is clicked --
            // while onConfirm's async work is still running. Any error it reports would then be
            // set on a dialog that no longer exists, and the isSubmitting state never shows.
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {translateOr(t, "ES_PM_CONFIRM_AND_SUBMIT", "Confirm & Submit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
