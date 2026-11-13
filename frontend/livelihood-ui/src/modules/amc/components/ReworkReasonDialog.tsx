import { translateOr, useTranslate } from "@/shared";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui";
import { useEffect, useState } from "react";

const MAX_REASON_LENGTH = 500;

interface ReworkReasonDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
}

/** The rejection reason is mandatory (PRD 5.5.2) and is shown to the vendor in their Inbox. */
export function ReworkReasonDialog({ open, isSubmitting, onOpenChange, onSubmit }: Readonly<ReworkReasonDialogProps>) {
  const { t } = useTranslate();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  function handleSubmit() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(translateOr(t, "ES_AMC_REWORK_REASON_REQUIRED", "Please enter a reason for rework"));
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translateOr(t, "ES_AMC_SEND_FOR_REWORK", "Send for Rework")}</DialogTitle>
          <DialogDescription>
            {translateOr(
              t,
              "ES_AMC_REWORK_DESCRIPTION",
              "The vendor will see this reason and can correct and resubmit the report.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="amc-rework-reason" className="text-sm font-medium text-ink-950">
            {translateOr(t, "ES_AMC_REWORK_REASON", "Reason")}
            <span className="text-destructive"> *</span>
          </label>
          <textarea
            id="amc-rework-reason"
            maxLength={MAX_REASON_LENGTH}
            className="min-h-[100px] w-full rounded border border-ink-300 bg-card px-3 py-2 text-sm placeholder:text-ink-300"
            placeholder={translateOr(t, "ES_AMC_REWORK_REASON_PLACEHOLDER", "Explain what the vendor needs to fix")}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
          />
          <div className="flex justify-between text-xs">
            <span className="text-destructive">{error}</span>
            <span className="text-muted-foreground">
              {reason.length}/{MAX_REASON_LENGTH}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={isSubmitting} onClick={handleSubmit}>
            {translateOr(t, "ES_AMC_SEND_FOR_REWORK", "Send for Rework")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
