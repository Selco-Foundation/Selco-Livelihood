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

interface TurnOffAmcDialogProps {
  /** The end user whose AMC is being turned off; null when the dialog is closed. */
  endUserName: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Turning an AMC off can't be undone (a new AMC can be added later), so it is confirmed first. */
export function TurnOffAmcDialog({ endUserName, isPending, onCancel, onConfirm }: Readonly<TurnOffAmcDialogProps>) {
  const { t } = useTranslate();

  return (
    <AlertDialog open={endUserName !== null} onOpenChange={(open) => !open && !isPending && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {translateOr(t, "ES_PM_AMC_TURN_OFF_TITLE", "Turn off the AMC for {endUser}?").replace(
              "{endUser}",
              endUserName ?? "",
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {translateOr(
              t,
              "ES_PM_AMC_TURN_OFF_DESC",
              "Upcoming visits are removed. Reports already submitted stay and can still be reviewed. This can't be undone; you can add a new AMC for this end user later.",
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onCancel}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
            // Keep the dialog up until the call finishes; the caller closes it.
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {translateOr(t, "ES_PM_AMC_TURN_OFF", "Turn off AMC")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
