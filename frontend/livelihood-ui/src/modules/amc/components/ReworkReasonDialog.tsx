import { isOtherReason, translateOr, useTranslate, type RejectionReasonOption } from "@/shared";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from "@/ui";
import { useEffect, useState } from "react";
import type { AmcReworkReason } from "../types/amc-visit";
import { reworkCharactersLeft } from "../utils/rework";

const MAX_COMMENT_LENGTH = 500;

interface ReworkReasonDialogProps {
  open: boolean;
  isSubmitting: boolean;
  /** MDMS `AMC.RejectionReasons`. */
  reasonOptions: RejectionReasonOption[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (reasons: AmcReworkReason[]) => void;
}

/**
 * At least one reason is required, each with an optional comment; "Others" needs a comment
 * (the server refuses it otherwise). The field staff sees the reasons in their Inbox.
 */
export function ReworkReasonDialog({
  open,
  isSubmitting,
  reasonOptions,
  onOpenChange,
  onSubmit,
}: Readonly<ReworkReasonDialogProps>) {
  const { t } = useTranslate();
  // Selected reason codes, each with its comment.
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSelected({});
      setError("");
    }
  }, [open]);

  function toggle(code: string, checked: boolean) {
    setError("");
    setSelected((current) => {
      const next = { ...current };
      if (checked) next[code] = "";
      else delete next[code];
      return next;
    });
  }

  const chosen = reasonOptions.filter((option) => option.code in selected);
  const reasons: AmcReworkReason[] = chosen.map((option) => {
    const comment = selected[option.code].trim();
    return comment ? { reason: option.code, comment } : { reason: option.code };
  });
  const charactersLeft = reworkCharactersLeft(reasons);

  function handleSubmit() {
    if (chosen.length === 0) {
      setError(translateOr(t, "ES_AMC_REWORK_REASON_REQUIRED", "Select at least one reason for rework"));
      return;
    }
    if (chosen.some((option) => isOtherReason(option) && !selected[option.code].trim())) {
      setError(translateOr(t, "ES_AMC_OTHER_REASON_COMMENT_REQUIRED", "Please add a comment for \"Others\""));
      return;
    }
    onSubmit(reasons);
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
              "The field staff will see these reasons and can correct and resubmit the report.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {reasonOptions.map((option) => {
            const checked = option.code in selected;
            const inputId = `amc-rework-${option.code}`;
            return (
              <div key={option.code} className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-950">
                  <Checkbox
                    className="size-5 rounded-md border-2 border-primary"
                    checked={checked}
                    onCheckedChange={(value) => toggle(option.code, value === true)}
                  />
                  {option.name}
                </label>
                {checked ? (
                  <textarea
                    id={inputId}
                    aria-label={`${translateOr(t, "ES_AMC_REWORK_COMMENT", "Comment")}, ${option.name}`}
                    maxLength={MAX_COMMENT_LENGTH}
                    className="min-h-[64px] w-full rounded border border-ink-300 bg-card px-3 py-2 text-sm placeholder:text-ink-300"
                    placeholder={
                      isOtherReason(option)
                        ? translateOr(t, "ES_AMC_REWORK_COMMENT_REQUIRED_PLACEHOLDER", "Explain what needs to be fixed (required)")
                        : translateOr(t, "ES_AMC_REWORK_COMMENT_PLACEHOLDER", "Add details (optional)")
                    }
                    value={selected[option.code]}
                    onChange={(event) => {
                      const value = event.target.value;
                      setError("");
                      setSelected((current) => ({ ...current, [option.code]: value }));
                    }}
                  />
                ) : null}
              </div>
            );
          })}
          {reasonOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {translateOr(t, "ES_AMC_REWORK_REASONS_LOADING", "Loading reasons...")}
            </p>
          ) : null}
        </div>
        {chosen.length > 0 ? (
          <p aria-live="polite" className={cn("text-sm", charactersLeft < 0 ? "text-destructive" : "text-muted-foreground")}>
            {charactersLeft < 0
              ? translateOr(
                  t,
                  "ES_AMC_REWORK_TOO_LONG",
                  "The comments are too long together. Remove {count} characters.",
                ).replace("{count}", String(-charactersLeft))
              : translateOr(
                  t,
                  "ES_AMC_REWORK_CHARACTERS_LEFT",
                  "{count} characters left for all comments together",
                ).replace("{count}", String(charactersLeft))}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {translateOr(t, "CORE_COMMON_CANCEL", "Cancel")}
          </Button>
          <Button type="button" variant="destructive" size="sm" disabled={isSubmitting || charactersLeft < 0} onClick={handleSubmit}>
            {translateOr(t, "ES_AMC_SEND_FOR_REWORK", "Send for Rework")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
