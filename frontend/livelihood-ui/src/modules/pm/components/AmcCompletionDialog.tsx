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
import type { AmcCompletion } from "../types/amc";

interface AmcCompletionDialogProps {
  /** The AMCs the save would end; the dialog is closed when empty. */
  completions: AmcCompletion[];
  onCancel: () => void;
  onConfirm: () => void;
}

/** Asked before a save that leaves an AMC with no further visits, because a completed AMC is final. */
export function AmcCompletionDialog({ completions, onCancel, onConfirm }: Readonly<AmcCompletionDialogProps>) {
  const { t } = useTranslate();

  return (
    <AlertDialog open={completions.length > 0} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{translateOr(t, "ES_PM_AMC_COMPLETE_TITLE", "Complete the AMC?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {translateOr(
              t,
              "ES_PM_AMC_COMPLETE_DESC",
              "With these years and frequency no more visits are left, so the upcoming visit is removed. A completed AMC can't be edited or reopened; you can add a new AMC later.",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
          {completions.map((completion) => (
            <li key={completion.id}>
              <span className="font-semibold">{completion.endUserName}</span>:{" "}
              {completion.completesNow
                ? translateOr(t, "ES_PM_AMC_COMPLETES_NOW", "the AMC is completed as soon as you save")
                : translateOr(
                    t,
                    "ES_PM_AMC_COMPLETES_LATER",
                    "the AMC is completed once its submitted reports are approved",
                  )}
            </li>
          ))}
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={onConfirm}>
            {translateOr(t, "ES_PM_AMC_COMPLETE_CONFIRM", "Save and complete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
